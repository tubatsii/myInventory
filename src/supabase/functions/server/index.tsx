import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import nodemailer from "npm:nodemailer";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

/**
 * PANDA POS Server - Email Notifications
 * 
 * This server includes automated low stock email notifications.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Configure the following environment variables in your Supabase project:
 *    - EMAIL_HOST: Your SMTP server (e.g., smtp.gmail.com)
 *    - EMAIL_PORT: SMTP port (587 for TLS, 465 for SSL)
 *    - EMAIL_USER: Your email address
 *    - EMAIL_PASSWORD: Your email password or app-specific password
 *    - EMAIL_TO: Recipient email address for low stock alerts
 *    - EMAIL_FROM: (Optional) Sender email address (defaults to EMAIL_USER)
 * 
 * 2. For Gmail users:
 *    - Enable 2-factor authentication
 *    - Generate an "App Password" at https://myaccount.google.com/apppasswords
 *    - Use the app password as EMAIL_PASSWORD
 * 
 * 3. The email is automatically sent at 06:00 daily (end of shift)
 *    - Set up a cron job or use the EmailScheduler component in the frontend
 *    - Manual trigger available via: POST /make-server-cc9de453/send-low-stock-email
 * 
 * 4. To set up automated scheduling:
 *    - Use a service like cron-job.org, EasyCron, or GitHub Actions
 *    - Schedule a POST request to your endpoint daily at 06:00
 *    - Example curl: curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/make-server-cc9de453/send-low-stock-email \
 *                         -H "Authorization: Bearer YOUR_ANON_KEY"
 */

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-cc9de453/health", (c) => {
  return c.json({ status: "ok" });
});

// Low Stock Email Notification Endpoint
app.post("/make-server-cc9de453/send-low-stock-email", async (c) => {
  try {
    console.log("📧 Starting low stock email notification process...");

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Fetch all items from inventory
    const { data: items, error: itemsError } = await supabase
      .from("items")
      .select("*")
      .order("name");

    if (itemsError) {
      console.error("❌ Error fetching items:", itemsError);
      return c.json({ error: "Failed to fetch items", details: itemsError }, 500);
    }

    // Filter items that are low in stock
    const lowStockItems = items.filter(
      (item: any) => item.quantity <= item.low_stock_threshold
    );

    console.log(`📊 Found ${lowStockItems.length} low stock items out of ${items.length} total items`);

    if (lowStockItems.length === 0) {
      console.log("✅ No low stock items. No email needed.");
      return c.json({ 
        success: true, 
        message: "No low stock items to report",
        lowStockCount: 0
      });
    }

    // Get email configuration from environment variables
    const EMAIL_HOST = Deno.env.get("EMAIL_HOST");
    const EMAIL_PORT = parseInt(Deno.env.get("EMAIL_PORT") || "587");
    const EMAIL_USER = Deno.env.get("EMAIL_USER");
    const EMAIL_PASSWORD = Deno.env.get("EMAIL_PASSWORD");
    const EMAIL_TO = Deno.env.get("EMAIL_TO");
    const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || EMAIL_USER;

    if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASSWORD || !EMAIL_TO) {
      console.error("❌ Email configuration missing. Please set EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD, and EMAIL_TO environment variables.");
      return c.json({ 
        error: "Email configuration missing. Please configure email settings in environment variables.",
        required: ["EMAIL_HOST", "EMAIL_USER", "EMAIL_PASSWORD", "EMAIL_TO"]
      }, 500);
    }

    // Create nodemailer transporter
    console.log(`📮 Setting up email transporter with host: ${EMAIL_HOST}`);
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465, // true for 465, false for other ports
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
      },
    });

    // Get current time in local timezone (Africa/Maseru - GMT+2)
    const currentDate = new Date();
    const localDateString = currentDate.toLocaleString('en-US', {
      timeZone: 'Africa/Maseru',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    // Generate HTML email content
    const emailHtml = generateLowStockEmailHtml(lowStockItems, localDateString);
    const emailText = generateLowStockEmailText(lowStockItems, localDateString);

    // Send email
    console.log(`📨 Sending email to: ${EMAIL_TO}`);
    const info = await transporter.sendMail({
      from: `"PANDA POS System" <${EMAIL_FROM}>`,
      to: EMAIL_TO,
      subject: `🚨 Low Stock Alert - End of Shift Report (${currentDate.toLocaleDateString('en-US', { timeZone: 'Africa/Maseru' })})`,
      text: emailText,
      html: emailHtml,
    });

    console.log("✅ Email sent successfully! Message ID:", info.messageId);

    return c.json({
      success: true,
      message: "Low stock email sent successfully",
      messageId: info.messageId,
      lowStockCount: lowStockItems.length,
      items: lowStockItems.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        threshold: item.low_stock_threshold,
      })),
    });
  } catch (error) {
    console.error("❌ Error in send-low-stock-email endpoint:", error);
    return c.json({ 
      error: "Failed to send low stock email", 
      details: error.message 
    }, 500);
  }
});

// Helper function to generate HTML email
function generateLowStockEmailHtml(items: any[], localDateString: string): string {
  const outOfStockItems = items.filter((item: any) => item.quantity === 0);
  const lowStockItems = items.filter((item: any) => item.quantity > 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 10px 10px;
        }
        .summary {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          border-left: 4px solid #ef4444;
        }
        .summary h2 {
          margin-top: 0;
          color: #dc2626;
          font-size: 18px;
        }
        .stats {
          display: flex;
          gap: 20px;
          margin: 20px 0;
        }
        .stat-box {
          flex: 1;
          background: white;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          border: 2px solid #e5e7eb;
        }
        .stat-number {
          font-size: 32px;
          font-weight: bold;
          color: #dc2626;
          margin: 0;
        }
        .stat-label {
          font-size: 14px;
          color: #6b7280;
          margin: 5px 0 0 0;
        }
        table {
          width: 100%;
          background: white;
          border-collapse: collapse;
          border-radius: 8px;
          overflow: hidden;
          margin: 20px 0;
        }
        th {
          background: #1f2937;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 600;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        tr:last-child td {
          border-bottom: none;
        }
        tr:hover {
          background: #f9fafb;
        }
        .out-of-stock {
          color: #dc2626;
          font-weight: bold;
        }
        .low-stock {
          color: #f59e0b;
          font-weight: bold;
        }
        .category-badge {
          display: inline-block;
          padding: 4px 8px;
          background: #e0e7ff;
          color: #4338ca;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #6b7280;
          font-size: 14px;
        }
        .alert-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="alert-icon">🚨</div>
        <h1>PANDA NIGHT CLUB</h1>
        <p style="margin: 5px 0 0 0;">Low Stock Alert - End of Shift Report</p>
        <p style="margin: 5px 0 0 0; font-size: 14px;">${localDateString}</p>
      </div>
      
      <div class="content">
        <div class="summary">
          <h2>⚠️ Immediate Attention Required</h2>
          <p>The following items need to be restocked before the next shift.</p>
        </div>

        <div class="stats">
          <div class="stat-box">
            <p class="stat-number">${items.length}</p>
            <p class="stat-label">Total Low Stock Items</p>
          </div>
          <div class="stat-box">
            <p class="stat-number">${outOfStockItems.length}</p>
            <p class="stat-label">Out of Stock</p>
          </div>
        </div>

        ${outOfStockItems.length > 0 ? `
          <h3 style="color: #dc2626; margin-top: 30px;">🔴 Out of Stock (${outOfStockItems.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Threshold</th>
              </tr>
            </thead>
            <tbody>
              ${outOfStockItems.map((item: any) => `
                <tr>
                  <td><strong>${item.name}</strong></td>
                  <td><span class="category-badge">${item.category}</span></td>
                  <td class="out-of-stock">${item.quantity}</td>
                  <td>${item.low_stock_threshold}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${lowStockItems.length > 0 ? `
          <h3 style="color: #f59e0b; margin-top: 30px;">🟡 Low Stock (${lowStockItems.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Threshold</th>
              </tr>
            </thead>
            <tbody>
              ${lowStockItems.map((item: any) => `
                <tr>
                  <td><strong>${item.name}</strong></td>
                  <td><span class="category-badge">${item.category}</span></td>
                  <td class="low-stock">${item.quantity}</td>
                  <td>${item.low_stock_threshold}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-top: 20px;">
          <strong>📋 Action Required:</strong>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>Review and order stock for out-of-stock items immediately</li>
            <li>Monitor low stock items for next shift</li>
            <li>Update inventory in the POS system after restocking</li>
          </ul>
        </div>
      </div>

      <div class="footer">
        <p>This is an automated report from PANDA POS System</p>
        <p>Report generated at shift end (06:00)</p>
      </div>
    </body>
    </html>
  `;
}

// Helper function to generate plain text email
function generateLowStockEmailText(items: any[], localDateString: string): string {
  const outOfStockItems = items.filter((item: any) => item.quantity === 0);
  const lowStockItems = items.filter((item: any) => item.quantity > 0);

  let text = `PANDA NIGHT CLUB - Low Stock Alert\n`;
  text += `End of Shift Report\n`;
  text += `${localDateString}\n`;
  text += `================================\n\n`;

  text += `SUMMARY\n`;
  text += `-------\n`;
  text += `Total Low Stock Items: ${items.length}\n`;
  text += `Out of Stock: ${outOfStockItems.length}\n\n`;

  if (outOfStockItems.length > 0) {
    text += `OUT OF STOCK ITEMS (${outOfStockItems.length})\n`;
    text += `================================\n`;
    outOfStockItems.forEach((item: any) => {
      text += `- ${item.name} (${item.category})\n`;
      text += `  Current: ${item.quantity} | Threshold: ${item.low_stock_threshold}\n\n`;
    });
  }

  if (lowStockItems.length > 0) {
    text += `LOW STOCK ITEMS (${lowStockItems.length})\n`;
    text += `================================\n`;
    lowStockItems.forEach((item: any) => {
      text += `- ${item.name} (${item.category})\n`;
      text += `  Current: ${item.quantity} | Threshold: ${item.low_stock_threshold}\n\n`;
    });
  }

  text += `ACTION REQUIRED:\n`;
  text += `- Review and order stock for out-of-stock items immediately\n`;
  text += `- Monitor low stock items for next shift\n`;
  text += `- Update inventory in the POS system after restocking\n\n`;

  text += `---\n`;
  text += `This is an automated report from PANDA POS System\n`;
  text += `Report generated at shift end (06:00)\n`;

  return text;
}

Deno.serve(app.fetch);