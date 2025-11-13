# 🐼 PANDA POS System

A comprehensive Point-of-Sale system for PANDA NIGHT CLUB with role-based access control, inventory management, barcode scanning, and automated email notifications.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.0.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)

## ✨ Features

### 🔐 User Management
- **Role-Based Access Control**: Admin, Bartender, and Waitress roles
- **Secure Authentication**: Powered by Supabase Auth
- **User Dashboard**: Personalized experience for each role

### 💰 Point of Sale
- **Quick Sale**: Immediate payment processing
- **Tab System**: Open tabs for customers with pending orders
- **Multiple Payment Methods**: Cash, Visa, M-Pesa, EcoCash
- **Real-time Cart Management**: Add, remove, update quantities
- **Service Fees**: Automatic 10% service fee for waitress orders
- **VAT Calculation**: Built-in tax calculations
- **Receipt Printing**: Professional proforma receipts with PANDA branding

### 📦 Inventory Management
- **Real-time Stock Tracking**: Live inventory updates
- **Low Stock Alerts**: Visual warnings for items below threshold
- **Category Management**: Organize items by Beverages, Food, Shots, etc.
- **Price Management**: Easy price updates
- **Barcode Support**: Each item can have a unique barcode

### 📊 Advanced Features
- **Barcode Scanning**:
  - Hardware barcode scanner support (keyboard input)
  - Camera-based scanning using QuaggaJS
  - Multi-format support (EAN, UPC, Code 128, Code 39, etc.)
- **Email Notifications**:
  - Automated daily low-stock reports at 06:00
  - Beautiful HTML email templates
  - Powered by Nodemailer
- **Rider System**: Track free items given to riders
- **Shots & Specials**: Dedicated sections for shots and special items
- **Open Tabs Management**: Track and manage customer tabs
- **Reporting**: CSV export for sales and inventory data

### 📱 Responsive Design
- Mobile-friendly interface
- Tablet optimized
- Desktop layout
- Bootstrap 5 styling

## 🚀 Tech Stack

- **Frontend**: React 19.2.0 with TypeScript
- **Styling**: Bootstrap 5, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Realtime)
- **Icons**: Lucide React
- **Barcode**: QuaggaJS
- **Email**: Nodemailer
- **Build Tool**: Vite
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- SMTP email server (Gmail, etc.)

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/panda-pos-system.git
cd panda-pos-system
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Supabase**
   - Your Supabase project is already configured in `/utils/supabase/info.tsx`
   - Project ID: `hdjyxfbehzbajlzitrah`

4. **Configure Email (already set up in Supabase)**
   - Environment variables are configured in Supabase Edge Functions
   - EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_TO, EMAIL_FROM

5. **Start development server**
```bash
npm run dev
```

6. **Build for production**
```bash
npm run build
```

## 📦 Database Schema

The system uses the following main tables:
- `users` - User accounts with role-based access
- `items` - Inventory items
- `shots` - Shot menu items
- `specials` - Special menu items
- `orders` - Sales transactions
- `open_tabs` - Pending customer tabs
- `riders` - Free items tracking
- `kv_store_cc9de453` - Key-value storage

## 👥 User Roles

### Admin
- Full system access
- User management
- Inventory management
- Reports and analytics
- Email scheduler
- Sales processing

### Bartender
- POS access
- Inventory viewing
- Quick sales
- Tab management

### Waitress
- POS access (with 10% service fee)
- Tab management
- Order taking

## 💳 Payment Methods

The system supports multiple payment methods with Maloti (M) currency:
- 💵 Cash
- 💳 Visa
- 📱 M-Pesa
- 📱 EcoCash

## 📧 Email Notifications

Automated low-stock email reports are sent daily at 06:00 (end of shift):
- Beautiful HTML templates
- Summary statistics
- Out-of-stock items highlighted
- Low-stock items listed
- Action items for restocking

## 📱 Barcode Scanning

Two methods of barcode scanning:
1. **Hardware Scanner**: Any USB/Bluetooth barcode scanner that acts as a keyboard
2. **Camera Scanner**: Click the camera button to scan using device camera

## 🔒 Security

- Row Level Security (RLS) enabled in Supabase
- Role-based access control
- Secure authentication
- HTTPS only in production
- Service role key protected (server-side only)

## 🌐 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to:
- GitHub
- Vercel
- Custom domain setup
- Email scheduling setup

## 📊 Reporting Features

- **Sales Reports**: Daily/shift-based sales data
- **Inventory Reports**: Stock levels and values
- **CSV Export**: Download reports for external analysis
- **Real-time Dashboard**: Live statistics and metrics

## 🎨 Customization

The system is designed for PANDA NIGHT CLUB but can be customized:
- Update branding in receipt templates
- Modify service fee percentages
- Adjust shift times (currently 17:00-07:00)
- Change currency symbol (currently Maloti - M)

## 🤝 Contributing

This is a private project for PANDA NIGHT CLUB. For internal contributions:
1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📝 License

Proprietary - PANDA NIGHT CLUB

## 🆘 Support

For technical support or questions:
- Check the [DEPLOYMENT.md](./DEPLOYMENT.md) guide
- Review Supabase logs
- Check Vercel deployment logs
- Contact the development team

## 🎉 Acknowledgments

- Built with React and Supabase
- Barcode scanning powered by QuaggaJS
- Email notifications via Nodemailer
- Icons by Lucide

---

**Made with ❤️ for PANDA NIGHT CLUB**
