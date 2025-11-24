import Order from '../models/Order.js';

export const getSalesReport = async (req, res) => {
  try {
    const { period, date } = req.query; // Get both query params
    let startDate = new Date();
    let endDate = new Date();
    let reportIdentifier = "";

    if (period) {
      // --- Logic for Daily/Weekly/Monthly ---
      reportIdentifier = period;
      switch (period) {
        case 'daily':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        default:
          startDate.setHours(0, 0, 0, 0);
      }
      // For D/W/M, the end date is always 'now'
      endDate = new Date(); 
    
    } else if (date) {
      // --- Logic for Specific Date ---
      reportIdentifier = date;
      // Use UTC to avoid timezone issues with the date picker
      startDate = new Date(date);
      startDate.setUTCHours(0, 0, 0, 0);
      
      endDate = new Date(date);
      endDate.setUTCHours(23, 59, 59, 999);
    
    } else {
      // Default to daily if no query is sent
      reportIdentifier = 'daily';
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
    }

    // Find all 'paid' orders within the calculated date range
    const paidOrders = await Order.find({
      status: 'paid',
      paidAt: { $gte: startDate, $lte: endDate }
    });

    // Calculate total sales
    let totalSales = 0;
    paidOrders.forEach(order => {
      totalSales += order.total;
    });

    // Send the report data
    res.json({
      reportType: reportIdentifier, // This will be 'daily' or '2025-11-07'
      totalSales: totalSales.toFixed(2),
      totalOrders: paidOrders.length,
      orders: paidOrders
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};