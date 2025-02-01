// Existing code
function updateTransactions() {
  const year = document.getElementById('transactionYearSelect').value;
  const month = document.getElementById('transactionMonthSelect').value;
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Get all orders across different arrays
  const allOrders = [
    ...orders,
    ...JSON.parse(localStorage.getItem('archivedOrders') || '[]')
  ];

  // Filter completed orders for the selected month
  const monthOrders = allOrders.filter(order => {
    const orderDate = new Date(order.date);
    return orderDate >= startDate && 
           orderDate <= endDate && 
           order.status === 'completed';
  });

  // Clear existing transactions
  const transactionsBody = document.getElementById('transactionsBody');
  transactionsBody.innerHTML = '';

  // Track total sales
  let totalMonthSales = 0;

  // Add transactions for each order's items
  monthOrders.forEach(order => {
    order.items.forEach(item => {
      const transactionRow = document.createElement('tr');
      transactionRow.innerHTML = `
        <td>${new Date(order.date).toLocaleDateString()}</td>
        <td>Venta</td>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>$${item.price.toFixed(2)}</td>
        <td>$${(item.price * item.quantity).toFixed(2)}</td>
      `;
      transactionsBody.appendChild(transactionRow);
      
      // Add to total sales
      totalMonthSales += item.price * item.quantity;
    });
  });

  // Update total month sales display
  const totalMonthSalesElement = document.getElementById('totalMonthSales');
  if (totalMonthSalesElement) {
    totalMonthSalesElement.textContent = `$${totalMonthSales.toFixed(2)}`;
  }
}

// Order submission code
document.getElementById('newOrderForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const customerName = document.querySelector('[name="customerName"]').value;
  const customerPhone = document.querySelector('[name="customerPhone"]').value;

  const order = {
    id: Date.now(),
    customer: customerName,
    phone: customerPhone,
    items: [...currentOrderItems],
    total: currentOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    status: 'orders',
    date: new Date(),
  };

  // Update inventory quantities
  currentOrderItems.forEach(orderItem => {
    const productIndex = inventory.findIndex(p => p.id === orderItem.id);
    if (productIndex !== -1) {
      inventory[productIndex].quantity -= orderItem.quantity;
    }
  });

  addOrderToDisplay(order);
  updateInventoryGrid();
  updateDashboardStats();
  updateTotalProductsCount(); 
  orders.push(order);
  saveData();
  newOrderModal.style.display = 'none';
  resetOrderForm();
});

// Modify the order status update to handle product quantity restoration if needed
window.updateOrderStatus = (orderId, newStatus) => {
  const order = orders.find(o => o.id === orderId);
  if (order) {
    const oldStatus = order.status;
    order.status = newStatus;
    
    // If order is completed, reduce product quantities
    if (newStatus === 'completed') {
      order.items.forEach(item => {
        const productIndex = inventory.findIndex(p => p.id === item.id);
        if (productIndex !== -1) {
          inventory[productIndex].quantity = Math.max(
            0, 
            inventory[productIndex].quantity - item.quantity
          );
        }
      });
    }
    
    const orderCard = document.querySelector(`.order-card[data-id="${orderId}"]`);
    if (orderCard) {
      orderCard.remove();
    }
    
    const targetContainer = document.querySelector(`#${newStatus} .orders-container`);
    if (targetContainer) {
      const newOrderCard = createOrderCard(order);
      targetContainer.prepend(newOrderCard);
    }

    if (newStatus === 'completed' && oldStatus !== 'completed') {
      const currentBalance = parseFloat(localStorage.getItem('currentBalance') || '0');
      const newBalance = currentBalance + order.total;
      localStorage.setItem('currentBalance', newBalance);
      document.getElementById('totalSales').textContent = `$${newBalance.toFixed(2)}`;
    }
    
    updateOrderCount();
    updateInventoryGrid();
    updateTotalProductsCount(); 
    saveData();
  }
};

// Ensure total products count is updated in multiple places
function updateTotalProductsCount() {
  const totalProducts = inventory.reduce((sum, product) => sum + product.quantity, 0);
  document.getElementById('totalProducts').textContent = totalProducts;
}

// Add a function to restore product quantities if an order is cancelled or removed
function restoreProductQuantities(orderItems) {
  orderItems.forEach(item => {
    const productIndex = inventory.findIndex(p => p.id === item.id);
    if (productIndex !== -1) {
      inventory[productIndex].quantity += item.quantity;
    }
  });
  
  updateInventoryGrid();
  updateTotalProductsCount();
  saveData();
}

// Modify delete order function to restore quantities
window.deleteOrder = (orderId) => {
  let orderIndex = orders.findIndex(o => o.id === orderId);
  let targetArray = orders;
  
  if (orderIndex === -1) {
    orderIndex = archivedOrders.findIndex(o => o.id === orderId);
    targetArray = archivedOrders;
  }

  if (orderIndex > -1) {
    const order = targetArray[orderIndex];
    
    // Restore product quantities before deleting
    restoreProductQuantities(order.items);
    
    targetArray.splice(orderIndex, 1);
    saveData();
    const orderCard = document.querySelector(`.order-card[data-id="${orderId}"]`);
    if (orderCard) {
      orderCard.remove();
    }
    document.querySelector('.floating-confirm')?.remove();
    
    updateTotalProductsCount();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const transactionsTab = document.querySelector('.tab-btn[data-section="transactions"]');
  if (transactionsTab) {
    transactionsTab.addEventListener('click', () => {
      updateTransactions();
    });
  }

  // Ensure transactions are updated when relevant events occur
  ['updateOrderStatus', 'archiveOrder', 'unarchiveOrder', 'deleteOrder'].forEach(eventName => {
    window[eventName] = function() {
      // Call original function
      const originalFunction = eval(eventName);
      originalFunction.apply(this, arguments);
      
      // Update transactions
      updateTransactions();
    };
  });

  // Populate date selectors
  const currentYear = new Date().getFullYear();
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const yearSelectors = document.querySelectorAll('#transactionYearSelect');
  const monthSelectors = document.querySelectorAll('#transactionMonthSelect');

  yearSelectors.forEach(selector => {
    for (let year = currentYear; year <= currentYear + 5; year++) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      selector.appendChild(option);
    }
    selector.value = currentYear;
  });

  monthSelectors.forEach(selector => {
    months.forEach((month, index) => {
      const option = document.createElement('option');
      option.value = index + 1;
      option.textContent = month;
      selector.appendChild(option);
    });
    selector.value = new Date().getMonth() + 1;
  });

  // Add event listeners for year and month selectors
  yearSelectors.forEach(selector => {
    selector.addEventListener('change', updateTransactions);
  });

  monthSelectors.forEach(selector => {
    selector.addEventListener('change', updateTransactions);
  });

  // Initial update of transactions
  updateTransactions();
});