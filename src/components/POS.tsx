import { useEffect, useState } from 'react';
import { getCurrentUser } from '../utils/auth';
import { supabase, Item, Shot, Special } from '../utils/supabase/client';
import { Search, ShoppingCart, Plus, Minus, Trash2, DollarSign, CreditCard, Smartphone, Printer, Receipt, FileText, Zap, Utensils, Scan, Camera } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';

interface CartItem {
  item: Item | Shot | Special;
  quantity: number;
  isShot: boolean;
  isSpecial: boolean;
}

interface OpenTab {
  id: string;
  table_name: string;
  created_at: string;
  updated_at: string;
  total: number;
  service_fee: number;
  items: CartItem[];
}

type PaymentMethod = 'cash' | 'visa' | 'mpesa' | 'ecocash';

export default function POS() {
  const user = getCurrentUser();
  const [items, setItems] = useState<Item[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [specials, setSpecials] = useState<Special[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [barcode, setBarcode] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [orderType, setOrderType] = useState<'quick' | 'tab'>('quick');
  const [tableName, setTableName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOpenTabs, setShowOpenTabs] = useState(false);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [viewMode, setViewMode] = useState<'items' | 'shots' | 'specials'>('items');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [scannerBuffer, setScannerBuffer] = useState('');
  const [scannerTimeout, setScannerTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showScanFeedback, setShowScanFeedback] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState('');
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  // Automatic barcode scanner detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Barcode scanners typically send characters very fast and end with Enter
      if (e.key === 'Enter') {
        if (scannerBuffer.length > 0) {
          // Process the scanned barcode
          processBarcode(scannerBuffer);
          setScannerBuffer('');
          if (scannerTimeout) clearTimeout(scannerTimeout);
        }
      } else if (e.key.length === 1) {
        // Add character to buffer
        setScannerBuffer(prev => prev + e.key);
        
        // Clear buffer after 100ms of inactivity (scanner sends data faster)
        if (scannerTimeout) clearTimeout(scannerTimeout);
        const timeout = setTimeout(() => {
          setScannerBuffer('');
        }, 100);
        setScannerTimeout(timeout);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (scannerTimeout) clearTimeout(scannerTimeout);
    };
  }, [scannerBuffer, scannerTimeout, items, shots]);

  const processBarcode = (scannedCode: string) => {
    // Try to find item by barcode
    const item = items.find(i => i.barcode === scannedCode);
    const shot = shots.find(s => s.barcode === scannedCode);
    
    if (item) {
      addToCart(item);
      setLastScannedItem(item.name);
      showScanSuccessFeedback();
    } else if (shot) {
      addShotToCart(shot);
      setLastScannedItem(shot.name);
      showScanSuccessFeedback();
    } else {
      // Item not found - show error
      setLastScannedItem('Item not found');
      showScanErrorFeedback();
    }
  };

  const showScanSuccessFeedback = () => {
    setShowScanFeedback(true);
    // Play success beep (optional)
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.3;
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Audio not supported, ignore
    }
    
    setTimeout(() => setShowScanFeedback(false), 2000);
  };

  const showScanErrorFeedback = () => {
    setShowScanFeedback(true);
    // Play error beep
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 200;
      gainNode.gain.value = 0.3;
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      // Audio not supported, ignore
    }
    
    setTimeout(() => setShowScanFeedback(false), 2000);
  };

  useEffect(() => {
    loadItems();
    loadShots();
    loadSpecials();
    loadOpenTabs();

    // Subscribe to real-time updates
    const itemsSubscription = supabase
      .channel('items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        loadItems();
      })
      .subscribe();

    const shotsSubscription = supabase
      .channel('shots_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shots' }, () => {
        loadShots();
      })
      .subscribe();

    const ordersSubscription = supabase
      .channel('orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOpenTabs();
      })
      .subscribe();

    return () => {
      itemsSubscription.unsubscribe();
      shotsSubscription.unsubscribe();
      ordersSubscription.unsubscribe();
    };
  }, []);

  const loadItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('name');

    if (data) {
      setItems(data);
      const uniqueCategories = Array.from(new Set(data.map((item: Item) => item.category)));
      setCategories(uniqueCategories);
    }
  };

  const loadShots = async () => {
    const { data, error } = await supabase
      .from('shots')
      .select('*')
      .order('name');

    if (data) {
      setShots(data);
    }
  };

  const loadSpecials = async () => {
    const { data, error } = await supabase
      .from('specials')
      .select('*')
      .order('name');

    if (data) {
      setSpecials(data);
    }
  };

  const loadOpenTabs = async () => {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, order_items(*, items(*)), order_shots(*, shots(*)), order_specials(*, specials(*))')
      .eq('status', 'pending')
      .eq('staff_id', user?.id) // Filter by current user
      .order('updated_at', { ascending: false });

    if (orders) {
      const tabs: OpenTab[] = orders.map((order: any) => {
        const items: CartItem[] = [
          ...order.order_items.map((oi: any) => ({
            item: oi.items,
            quantity: oi.quantity,
            isShot: false,
            isSpecial: false,
          })),
          ...order.order_shots.map((os: any) => ({
            item: os.shots,
            quantity: os.quantity,
            isShot: true,
            isSpecial: false,
          })),
          ...order.order_specials.map((osp: any) => ({
            item: osp.specials,
            quantity: osp.quantity,
            isShot: false,
            isSpecial: true,
          })),
        ];
        return {
          id: order.id,
          table_name: order.table_name,
          created_at: order.created_at,
          updated_at: order.updated_at,
          total: order.total,
          service_fee: order.service_fee,
          items,
        };
      });
      setOpenTabs(tabs);
    }
  };

  const handleBarcodeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const item = items.find(i => i.barcode === barcode);
    if (item) {
      addToCart(item);
      setBarcode('');
    }
  };

  const addToCart = (item: Item) => {
    if (item.quantity <= 0) {
      alert('Item out of stock!');
      return;
    }

    const existingIndex = cart.findIndex(ci => ci.item.id === item.id);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      if (newCart[existingIndex].quantity < item.quantity) {
        newCart[existingIndex].quantity++;
        setCart(newCart);
      } else {
        alert('Not enough stock available!');
      }
    } else {
      setCart([...cart, { item, quantity: 1, isShot: false, isSpecial: false }]);
    }
  };

  const addShotToCart = (shot: Shot) => {
    const existingIndex = cart.findIndex(ci => ci.item.id === shot.id && ci.isShot);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity++;
      setCart(newCart);
    } else {
      setCart([...cart, { item: shot, quantity: 1, isShot: true, isSpecial: false }]);
    }
  };

  const addSpecialToCart = (special: Special) => {
    const existingIndex = cart.findIndex(ci => ci.item.id === special.id && ci.isSpecial);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity++;
      setCart(newCart);
    } else {
      setCart([...cart, { item: special, quantity: 1, isShot: false, isSpecial: true }]);
    }
  };

  const updateQuantity = (itemId: string, change: number, isShot: boolean, isSpecial: boolean) => {
    const newCart = cart.map(ci => {
      if (ci.item.id === itemId && ci.isShot === isShot && ci.isSpecial === isSpecial) {
        const newQty = ci.quantity + change;
        if (newQty <= 0) return null;
        
        // For shots and specials, no stock limit
        if (isShot || isSpecial) {
          return { ...ci, quantity: newQty };
        }
        
        // For items, check stock
        const item = ci.item as Item;
        if (newQty > item.quantity) {
          alert('Not enough stock available!');
          return ci;
        }
        return { ...ci, quantity: newQty };
      }
      return ci;
    }).filter(Boolean) as CartItem[];
    setCart(newCart);
  };

  const removeFromCart = (itemId: string, isShot: boolean, isSpecial: boolean) => {
    setCart(cart.filter(ci => !(ci.item.id === itemId && ci.isShot === isShot && ci.isSpecial === isSpecial)));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, ci) => sum + (ci.item.price * ci.quantity), 0);
  };

  const calculateServiceFee = () => {
    return user?.role === 'waitress' ? calculateSubtotal() * 0.1 : 0;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateServiceFee();
  };

  const calculateVAT = () => {
    const total = calculateTotal();
    return total - (total / 1.15);
  };

  const saveAsTab = async () => {
    if (!tableName || cart.length === 0) {
      alert('Please enter a table name and add items to the cart');
      return;
    }

    setLoading(true);

    try {
      let orderId: string;

      if (editingTabId) {
        // Update existing tab
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            table_name: tableName,
            total: calculateTotal(),
            service_fee: calculateServiceFee(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTabId);

        if (updateError) throw updateError;

        // Delete existing order items and shots
        await supabase.from('order_items').delete().eq('order_id', editingTabId);
        await supabase.from('order_shots').delete().eq('order_id', editingTabId);
        await supabase.from('order_specials').delete().eq('order_id', editingTabId);

        orderId = editingTabId;
      } else {
        // Create new tab
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            table_name: tableName,
            status: 'pending',
            payment_method: null,
            total: calculateTotal(),
            service_fee: calculateServiceFee(),
            staff_id: user?.id,
          })
          .select()
          .single();

        if (orderError) throw orderError;
        orderId = order.id;
      }

      // Save items and shots
      for (const cartItem of cart) {
        if (cartItem.isShot) {
          // Save to order_shots table
          await supabase.from('order_shots').insert({
            order_id: orderId,
            shot_id: cartItem.item.id,
            staff_id: user?.id,
            quantity: cartItem.quantity,
            price_at_time: cartItem.item.price,
          });
        } else if (cartItem.isSpecial) {
          // Save to order_specials table
          await supabase.from('order_specials').insert({
            order_id: orderId,
            special_id: cartItem.item.id,
            staff_id: user?.id,
            quantity: cartItem.quantity,
            price_at_time: cartItem.item.price,
          });
        } else {
          // Save to order_items table
          await supabase.from('order_items').insert({
            order_id: orderId,
            item_id: cartItem.item.id,
            staff_id: user?.id,
            quantity: cartItem.quantity,
            price_at_time: cartItem.item.price,
          });
        }
      }

      // Print proforma
      printProforma(orderId, tableName, cart, false);

      // Clear cart and reset
      setCart([]);
      setTableName('');
      setEditingTabId(null);
      await loadOpenTabs();

      alert(editingTabId ? 'Tab updated successfully! Proforma printed.' : 'Tab saved successfully! Proforma printed.');
    } catch (error) {
      console.error('❌ Error saving tab:', error);
      alert(`Failed to save tab: ${JSON.stringify(error, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  const printProforma = (orderId: string, table: string, items: CartItem[], isFinal: boolean) => {
    const subtotal = items.reduce((sum, ci) => sum + (ci.item.price * ci.quantity), 0);
    const serviceFee = user?.role === 'waitress' ? subtotal * 0.1 : 0;
    const total = subtotal + serviceFee;
    const vat = total - (total / 1.15);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Proforma - ${table}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', monospace;
            width: 80mm;
            margin: 0;
            padding: 10mm;
            font-size: 12px;
          }
          .center {
            text-align: center;
          }
          .header {
            margin-bottom: 15px;
          }
          .business-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .proforma-title {
            font-size: 16px;
            margin-bottom: 15px;
          }
          .info-line {
            margin: 3px 0;
            display: flex;
            justify-content: space-between;
          }
          .info-label {
            font-weight: bold;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          th {
            text-align: left;
            border-bottom: 1px solid #000;
            padding: 5px 0;
            font-weight: bold;
          }
          td {
            padding: 5px 0;
          }
          .right {
            text-align: right;
          }
          .totals {
            margin-top: 10px;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .grand-total {
            font-size: 16px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          .gratuity-field {
            margin: 10px 0;
            padding: 10px 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
          }
          .footer p {
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="header center">
          <div class="business-name">PANDA NIGHT CLUB</div>
          <div class="proforma-title">PROFORMA</div>
        </div>

        <div>
          <div class="info-line">
            <span class="info-label">Last Updated:</span>
            <span>${new Date().toLocaleString()}</span>
          </div>
          <div class="info-line">
            <span class="info-label">Table:</span>
            <span>${table}</span>
          </div>
          <div class="info-line">
            <span class="info-label">Staff:</span>
            <span>${user?.name || 'Unknown'}</span>
          </div>
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="right">Qty</th>
              <th class="right">Price</th>
              <th class="right">Value</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(ci => `
              <tr>
                <td>${ci.item.name}</td>
                <td class="right">${ci.quantity}</td>
                <td class="right">M${ci.item.price.toFixed(2)}</td>
                <td class="right">M${(ci.quantity * ci.item.price).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="divider"></div>

        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>M${subtotal.toFixed(2)}</span>
          </div>
          <div class="total-line">
            <span>Service Fee ${user?.role === 'waitress' ? '(10%)' : ''}:</span>
            <span>M${serviceFee.toFixed(2)}</span>
          </div>
          <div class="total-line grand-total">
            <span>Total:</span>
            <span>M${total.toFixed(2)}</span>
          </div>
          <div class="total-line" style="font-size: 10px; margin-top: 5px;">
            <span>VAT 15% (included):</span>
            <span>M${vat.toFixed(2)}</span>
          </div>
        </div>

        <div class="gratuity-field">
          <div class="total-line">
            <span>Gratuity:</span>
            <span>__________</span>
          </div>
          <div class="total-line" style="margin-top: 10px;">
            <span><strong>Total + Gratuity:</strong></span>
            <span>__________</span>
          </div>
        </div>

        <div class="footer">
          <p><strong>Thank you!</strong></p>
          <p>Enjoy the rest of your day!</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const completePayment = async () => {
    if (orderType === 'tab') {
      saveAsTab();
      return;
    }

    // Quick Sale
    if (!tableName && cart.length > 0) {
      setTableName('Quick Sale');
    }

    setLoading(true);

    try {
      // Create paid order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_name: tableName || 'Quick Sale',
          status: 'paid',
          payment_method: paymentMethod,
          total: calculateTotal(),
          service_fee: calculateServiceFee(),
          staff_id: user?.id, // Add staff_id
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items/shots and update inventory
      for (const cartItem of cart) {
        if (cartItem.isShot) {
          // Insert shot
          await supabase.from('order_shots').insert({
            order_id: order.id,
            shot_id: cartItem.item.id,
            staff_id: user?.id,
            quantity: cartItem.quantity,
            price_at_time: cartItem.item.price,
          });
        } else if (cartItem.isSpecial) {
          // Insert special
          await supabase.from('order_specials').insert({
            order_id: order.id,
            special_id: cartItem.item.id,
            staff_id: user?.id,
            quantity: cartItem.quantity,
            price_at_time: cartItem.item.price,
          });
        } else {
          // Insert item
          await supabase.from('order_items').insert({
            order_id: order.id,
            item_id: cartItem.item.id,
            staff_id: user?.id,
            quantity: cartItem.quantity,
            price_at_time: cartItem.item.price,
          });

          // Update inventory (only for regular items, not shots)
          const item = cartItem.item as Item;
          await supabase
            .from('items')
            .update({ quantity: item.quantity - cartItem.quantity })
            .eq('id', cartItem.item.id);
        }
      }

      // If this was a tab being closed, delete the old pending tab
      if (editingTabId) {
        await supabase.from('order_items').delete().eq('order_id', editingTabId);
        await supabase.from('order_shots').delete().eq('order_id', editingTabId);
        await supabase.from('orders').delete().eq('id', editingTabId);
      }

      // Print proforma
      printProforma(order.id, tableName || 'Quick Sale', cart, true);

      // Clear cart and reset
      setCart([]);
      setTableName('');
      setEditingTabId(null);
      setShowPayment(false);
      await loadItems();
      await loadOpenTabs();

      alert('Payment completed successfully!');
    } catch (error) {
      console.error('Error completing payment:', error);
      alert('Failed to complete payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadTab = async (tab: OpenTab) => {
    // Load tab into current cart for editing
    setCart(tab.items);
    setTableName(tab.table_name);
    setEditingTabId(tab.id);
    setOrderType('tab');
    setShowOpenTabs(false);
  };

  const closeTab = async (tab: OpenTab) => {
    // Load tab and prepare for payment
    setCart(tab.items);
    setTableName(tab.table_name);
    setEditingTabId(tab.id); // Track which tab we're closing
    setOrderType('quick');
    setShowOpenTabs(false);
    setShowPayment(true);
  };

  const deleteTab = async (tabId: string) => {
    if (!confirm('Are you sure you want to delete this tab?')) return;

    setLoading(true);
    try {
      // Delete order items first
      await supabase
        .from('order_items')
        .delete()
        .eq('order_id', tabId);

      // Delete order
      await supabase
        .from('orders')
        .delete()
        .eq('id', tabId);

      await loadOpenTabs();
      alert('Tab deleted successfully!');
    } catch (error) {
      console.error('Error deleting tab:', error);
      alert('Failed to delete tab. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reprintProforma = (tab: OpenTab) => {
    printProforma(tab.id, tab.table_name, tab.items, false);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === 'all' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Scan Feedback */}
      {showScanFeedback && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slideIn">
          <div className={`px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 ${
            lastScannedItem === 'Item not found' 
              ? 'bg-red-600 text-white' 
              : 'bg-green-600 text-white'
          }`}>
            {lastScannedItem === 'Item not found' ? (
              <>
                <Scan className="w-6 h-6" />
                <div>
                  <p className="font-bold">Scan Error</p>
                  <p className="text-sm">Item not found</p>
                </div>
              </>
            ) : (
              <>
                <Scan className="w-6 h-6" />
                <div>
                  <p className="font-bold">Item Added!</p>
                  <p className="text-sm">{lastScannedItem}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1">Point of Sale</h1>
          <p className="text-gray-500">Process orders and manage sales</p>
        </div>
        <button
          onClick={() => setShowOpenTabs(!showOpenTabs)}
          className="px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all font-medium flex items-center gap-2 shadow-sm"
        >
          <Receipt className="w-4 h-4" />
          Open Tabs ({openTabs.length})
        </button>
      </div>

      {/* Open Tabs Modal */}
      {showOpenTabs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-md shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-scaleIn">
            <div className="p-6 border-b bg-gray-900 text-white">
              <h2 className="text-white">Open Tabs</h2>
              <p className="text-gray-300 text-sm mt-1">Manage pending orders</p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {openTabs.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No open tabs</p>
                  <p className="text-gray-400 text-sm">Start a new tab to see it here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {openTabs.map(tab => (
                    <div key={tab.id} className="bg-gray-50 rounded-md p-4 border border-gray-200 hover:border-purple-300 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-gray-900 font-medium">{tab.table_name}</h3>
                          <p className="text-xs text-gray-500 mt-1">
                            Created {new Date(tab.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-900 font-semibold">M{tab.total.toFixed(2)}</p>
                          {tab.service_fee > 0 && (
                            <p className="text-xs text-gray-500">+M{tab.service_fee.toFixed(2)} service</p>
                          )}
                        </div>
                      </div>
                      <div className="mb-3 bg-white rounded-lg p-3">
                        {tab.items.map((ci, idx) => (
                          <div key={idx} className="flex justify-between text-sm py-1">
                            <span className="text-gray-700">{ci.quantity}x {ci.item.name}</span>
                            <span className="text-gray-900">M{(ci.quantity * ci.item.price).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadTab(tab)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Edit Tab
                        </button>
                        <button
                          onClick={() => reprintProforma(tab)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => closeTab(tab)}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Close & Pay
                        </button>
                        <button
                          onClick={() => deleteTab(tab.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowOpenTabs(false)}
                className="w-full px-6 py-3 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-all font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Barcode Scanner */}
          <form onSubmit={handleBarcodeSearch} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="🔍 Scan barcode or enter manually..."
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowCameraScanner(true)}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all font-medium flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-all font-medium"
              >
                Add
              </button>
            </div>
          </form>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Items/Shots/Specials Toggle */}
            <div className="grid grid-cols-3 gap-2 sm:w-auto">
              <button
                onClick={() => setViewMode('items')}
                className={`px-4 py-3 border-2 rounded-md transition-all font-medium flex items-center justify-center gap-2 ${
                  viewMode === 'items'
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-gray-300 hover:border-purple-300'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                Items
              </button>
              <button
                onClick={() => setViewMode('shots')}
                className={`px-4 py-3 border-2 rounded-md transition-all font-medium flex items-center justify-center gap-2 ${
                  viewMode === 'shots'
                    ? 'border-orange-600 bg-orange-50 text-orange-700'
                    : 'border-gray-300 hover:border-orange-300'
                }`}
              >
                <Zap className="w-4 h-4" />
                Shots
              </button>
              <button
                onClick={() => setViewMode('specials')}
                className={`px-4 py-3 border-2 rounded-md transition-all font-medium flex items-center justify-center gap-2 ${
                  viewMode === 'specials'
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-gray-300 hover:border-green-300'
                }`}
              >
                <Utensils className="w-4 h-4" />
                Specials
              </button>
            </div>

            {viewMode === 'items' && (
              <>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </>
            )}
          </div>

          {/* Items Grid */}
          {viewMode === 'items' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  disabled={item.quantity <= 0}
                  className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left card-hover"
                >
                  <p className="text-gray-900 font-medium mb-2 line-clamp-2">{item.name}</p>
                  <p className="text-purple-600 font-bold text-lg mb-2">M{item.price.toFixed(2)}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Stock: {item.quantity}</span>
                    {item.quantity <= item.low_stock_threshold && item.quantity > 0 && (
                      <span className="text-yellow-600 font-medium">Low</span>
                    )}
                    {item.quantity <= 0 && (
                      <span className="text-red-600 font-medium">Out</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Shots Grid */}
          {viewMode === 'shots' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {shots.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No shots available. Add some in the Shots management page.
                </div>
              ) : (
                shots.map(shot => (
                  <button
                    key={shot.id}
                    onClick={() => addShotToCart(shot)}
                    className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl shadow-md p-4 hover:shadow-lg hover:border-orange-400 transition-all text-left card-hover"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-gray-900 font-medium line-clamp-2 flex-1">{shot.name}</p>
                      <Zap className="w-4 h-4 text-orange-600 flex-shrink-0 ml-2" />
                    </div>
                    <p className="text-orange-600 font-bold text-lg">M{shot.price.toFixed(2)}</p>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Specials Grid */}
          {viewMode === 'specials' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {specials.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No specials available. Add some in the Specials management page.
                </div>
              ) : (
                specials.map(special => (
                  <button
                    key={special.id}
                    onClick={() => addSpecialToCart(special)}
                    className="bg-gradient-to-br from-green-50 to-lime-50 border-2 border-green-200 rounded-xl shadow-md p-4 hover:shadow-lg hover:border-green-400 transition-all text-left card-hover"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-gray-900 font-medium line-clamp-2 flex-1">{special.name}</p>
                      <Utensils className="w-4 h-4 text-green-600 flex-shrink-0 ml-2" />
                    </div>
                    <p className="text-green-600 font-bold text-lg">M{special.price.toFixed(2)}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 h-fit sticky top-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-purple-600">Current Order</h2>
          </div>

          {/* Order Type Selection */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2 font-medium">Order Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOrderType('quick')}
                className={`px-4 py-3 border-2 rounded-xl transition-all font-medium ${
                  orderType === 'quick'
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-gray-300 hover:border-purple-300'
                }`}
              >
                Quick Sale
              </button>
              <button
                onClick={() => setOrderType('tab')}
                className={`px-4 py-3 border-2 rounded-xl transition-all font-medium ${
                  orderType === 'tab'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-blue-300'
                }`}
              >
                Tab
              </button>
            </div>
          </div>

          {/* Table Name */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2 font-medium">
              {orderType === 'quick' ? 'Table/Customer Name' : 'Tab Name'}
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder={orderType === 'quick' ? 'e.g., Quick Sale, Walk-in' : 'e.g., VIP Booth, Table 5'}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
          </div>

          {/* Cart Items */}
          <div className="mb-4 max-h-64 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Cart is empty</p>
            ) : (
              <div className="space-y-2">
                {cart.map(ci => (
                  <div key={ci.item.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 text-sm font-medium truncate">{ci.item.name}</p>
                      <p className="text-gray-600 text-xs">M{ci.item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(ci.item.id, -1, ci.isShot, ci.isSpecial)}
                        className="p-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-sm font-medium min-w-[2rem] text-center">{ci.quantity}</span>
                      <button
                        onClick={() => updateQuantity(ci.item.id, 1, ci.isShot, ci.isSpecial)}
                        className="p-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(ci.item.id, ci.isShot, ci.isSpecial)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          {cart.length > 0 && (
            <div className="border-t-2 pt-4 space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span className="font-medium">M{calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Service Fee {user?.role === 'waitress' ? '(10%)' : ''}:</span>
                <span className="font-medium">M{calculateServiceFee().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-900 border-t-2 pt-2 text-lg">
                <span className="font-bold">Total:</span>
                <span className="font-bold">M{calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-xs">
                <span>VAT 15% (included):</span>
                <span>M{calculateVAT().toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {cart.length > 0 && !showPayment && (
            <div className="mt-6 space-y-2">
              {orderType === 'tab' ? (
                <button
                  onClick={saveAsTab}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-md font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      Save as Tab & Print Proforma
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setShowPayment(true)}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-md font-medium"
                >
                  Proceed to Payment
                </button>
              )}
              <button
                onClick={() => {
                  setCart([]);
                  setTableName('');
                }}
                className="w-full py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-medium"
              >
                Clear Cart
              </button>
            </div>
          )}

          {/* Payment Methods */}
          {showPayment && orderType === 'quick' && (
            <div className="mt-4 space-y-4 border-t-2 pt-4">
              <p className="text-gray-700 font-medium">Select Payment Method:</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'cash', label: 'Cash', icon: DollarSign },
                  { value: 'visa', label: 'Visa', icon: CreditCard },
                  { value: 'mpesa', label: 'M-Pesa', icon: Smartphone },
                  { value: 'ecocash', label: 'EcoCash', icon: Smartphone },
                ].map(method => (
                  <button
                    key={method.value}
                    onClick={() => setPaymentMethod(method.value as any)}
                    className={`p-3 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                      paymentMethod === method.value
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-300 hover:border-purple-300'
                    }`}
                  >
                    <method.icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{method.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPayment(false)}
                  className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={completePayment}
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-md font-medium disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Complete Payment'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Camera Barcode Scanner */}
      {showCameraScanner && (
        <BarcodeScanner
          onDetected={(barcode) => {
            processBarcode(barcode);
            setShowCameraScanner(false);
          }}
          onClose={() => setShowCameraScanner(false)}
        />
      )}
    </div>
  );
}