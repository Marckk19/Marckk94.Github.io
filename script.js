document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-btn');
  const sections = document.querySelectorAll('.section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      tab.classList.add('active');

      const sectionId = tab.dataset.section;
      document.getElementById(sectionId).classList.add('active');

      updateOrderCount();
    });
  });

  const withdrawBtn = document.getElementById('withdrawBtn');
  withdrawBtn.addEventListener('click', () => {
    const totalSalesElement = document.getElementById('totalSales');
    const totalSales = parseFloat(totalSalesElement.textContent.replace('$', '')) || 0;
    
    if (totalSales > 0) {
      const confirmDiv = document.createElement('div');
      confirmDiv.className = 'floating-confirm';
      confirmDiv.innerHTML = `
        <div class="floating-confirm-content">
          <h3>Retiro de Efectivo</h3>
          <p>Total disponible para retirar: $${totalSales.toFixed(2)}</p>
          <input type="number" id="withdrawAmount" placeholder="Monto a retirar" 
                 step="0.01" max="${totalSales}" min="0.01" 
                 style="width: 100%; padding: 8px; margin: 10px 0;">
          <div class="confirm-buttons">
            <button onclick="processWithdrawal()" class="confirm-btn">Confirmar Retiro</button>
            <button onclick="this.closest('.floating-confirm').remove()" class="cancel-btn">Cancelar</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmDiv);

      // Focus the input field
      setTimeout(() => {
        document.getElementById('withdrawAmount').focus();
      }, 100);
    } else {
      const confirmDiv = document.createElement('div');
      confirmDiv.className = 'floating-confirm';
      confirmDiv.innerHTML = `
        <div class="floating-confirm-content">
          <h3>No hay fondos disponibles</h3>
          <p>No hay ventas disponibles para retirar.</p>
          <div class="confirm-buttons">
            <button onclick="this.closest('.floating-confirm').remove()" class="cancel-btn">Cerrar</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmDiv);
    }
  });

  window.processWithdrawal = () => {
    const withdrawAmount = parseFloat(document.getElementById('withdrawAmount').value);
    const totalSalesElement = document.getElementById('totalSales');  
    const currentTotal = parseFloat(totalSalesElement.textContent.replace(/[^0-9.-]+/g, ''));

    if (withdrawAmount > 0 && withdrawAmount <= currentTotal) {
      // Store both the remaining balance and total withdrawals in localStorage
      const remainingBalance = currentTotal - withdrawAmount;
      const totalWithdrawals = parseFloat(localStorage.getItem('totalWithdrawals') || '0') + withdrawAmount;
      
      localStorage.setItem('totalWithdrawals', totalWithdrawals);
      localStorage.setItem('currentBalance', remainingBalance);
      
      totalSalesElement.textContent = `$${remainingBalance.toFixed(2)}`;

      // Add withdrawal transaction to the transactions table
      const transactionsBody = document.getElementById('transactionsBody');
      const newRow = document.createElement('tr');
      newRow.innerHTML = `
        <td>${new Date().toLocaleDateString()}</td>
        <td>Retiro</td>
        <td>Retiro de efectivo</td>
        <td>1</td>
        <td>$${withdrawAmount.toFixed(2)}</td>
        <td>$${withdrawAmount.toFixed(2)}</td>
      `;
      transactionsBody.appendChild(newRow);

      // Close the confirmation window
      document.querySelector('.floating-confirm').remove();

      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'floating-confirm';
      successDiv.innerHTML = `
        <div class="floating-confirm-content">
          <h3>Retiro Exitoso</h3>
          <p>Se ha retirado $${withdrawAmount.toFixed(2)} exitosamente.</p>
          <div class="confirm-buttons">
            <button onclick="this.closest('.floating-confirm').remove()" class="confirm-btn">Aceptar</button>
          </div>
        </div>
      `;
      document.body.appendChild(successDiv);
      
      // Save the updated total to localStorage
      saveData();
    } else {
      alert('Por favor ingrese un monto válido');
    }
  };

  const addProductBtn = document.getElementById('addProductBtn');
  addProductBtn.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('inventoryModal').style.display = 'block';
    resetInventoryForm();
  });

  const inventoryModalCloseBtn = document.getElementById('closeInventoryModal');
  inventoryModalCloseBtn.addEventListener('click', () => {
    document.getElementById('inventoryModal').style.display = 'none';
  });

  const newOrderModal = document.getElementById('newOrderModal');
  const newOrderBtn = document.getElementById('newOrderBtn');
  newOrderBtn.addEventListener('click', () => {
    newOrderModal.style.display = 'block';
    updateProductSelect();
  });

  const closeBtns = document.querySelectorAll('.close');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', (event) => {
      const modal = event.currentTarget.closest('.modal');
      modal.style.display = 'none';
      resetOrderForm();
    });
  });

  let currentOrderItems = [];
  let orders = JSON.parse(localStorage.getItem('orders')) || [];
  let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
  let archivedOrders = JSON.parse(localStorage.getItem('archivedOrders')) || [];
  let showingArchived = false;

  function saveData() {
    localStorage.setItem('orders', JSON.stringify(orders));
    localStorage.setItem('inventory', JSON.stringify(inventory));
    localStorage.setItem('archivedOrders', JSON.stringify(archivedOrders));
  }

  const inventoryForm = document.getElementById('inventoryForm');
  inventoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(inventoryForm);
    const newProduct = {
      id: Date.now(),
      name: formData.get('productName'),
      buyPrice: parseFloat(formData.get('buyPrice')),
      sellPrice: parseFloat(formData.get('sellPrice')),
      quantity: parseInt(formData.get('quantity')),
      imageUrl: formData.get('imageUrl'),
    };

    const fileInput = inventoryForm.querySelector('input[name="image"]');
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onloadend = function() {
        newProduct.imageUrl = reader.result;
        finishAddingProduct(newProduct);
      }
      reader.readAsDataURL(file);
    } else {
      newProduct.imageUrl = newProduct.imageUrl || 'https://via.placeholder.com/150';
      finishAddingProduct(newProduct);
    }
  });

  function finishAddingProduct(newProduct) {
    inventory.push(newProduct);
    addInventoryItem(newProduct);
    inventoryForm.reset();
    updateTotalProductsCount();
    updateTotalInvested();
    document.getElementById('inventoryModal').style.display = 'none';
    saveData();
  }

  function resetOrderForm() {
    document.getElementById('newOrderForm').reset();
    currentOrderItems = [];
    updateOrderSummary();
  }

  function resetInventoryForm() {
    document.getElementById('inventoryForm').reset();
  }

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

  const addToOrderBtn = document.getElementById('addToOrderBtn');
  addToOrderBtn.addEventListener('click', () => {
    const productSelect = document.getElementById('productSelect');
    const quantityInput = document.querySelector('[name="quantity"]');
    const productId = productSelect.value;
    const quantity = parseInt(quantityInput.value);

    if (productId && quantity > 0) {
      const product = inventory.find(p => p.id === parseInt(productId));
      if (product && product.quantity >= quantity) {
        const orderItem = {
          id: product.id,
          name: product.name,
          price: product.sellPrice,
          quantity: quantity
        };
        currentOrderItems.push(orderItem);
        updateOrderSummary();
        quantityInput.value = 0;
      } else {
        alert('No hay suficiente stock disponible');
      }
    }
  });

  function updateOrderSummary() {
    const orderItemsDiv = document.getElementById('orderItems');
    const orderTotalSpan = document.getElementById('orderTotal');
    
    orderItemsDiv.innerHTML = currentOrderItems.map(item => `
      <div class="order-item">
        <span>${item.name} x ${item.quantity}</span>
        <span>$${(item.price * item.quantity).toFixed(2)}</span>
        <button type="button" class="remove-item" onclick="removeOrderItem(${currentOrderItems.indexOf(item)})">&times;</button>
      </div>
    `).join('');
    
    const total = currentOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    orderTotalSpan.textContent = total.toFixed(2);
  }

  window.removeOrderItem = (index) => {
    currentOrderItems.splice(index, 1);
    updateOrderSummary();
  };

  function createOrderCard(order) {
    const orderCard = document.createElement('div');
    orderCard.className = 'order-card';
    orderCard.dataset.id = order.id;
    
    orderCard.innerHTML = `
      <div class="order-header">
        <span class="order-id">#${order.id}</span>
        <select class="order-status-select" onchange="updateOrderStatus(${order.id}, this.value)" ${order.archived ? 'disabled' : ''}>
          <option value="orders" ${order.status === 'orders' ? 'selected' : ''}>Pendiente</option>
          <option value="in-progress" ${order.status === 'in-progress' ? 'selected' : ''}>En Progreso</option>
          <option value="delivering" ${order.status === 'delivering' ? 'selected' : ''}>Enviando</option>
          <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completado</option>
        </select>
      </div>
      <div class="order-details">
        <p><strong>Cliente:</strong> ${order.customer}</p>
        <p><strong>Teléfono:</strong> ${order.phone}</p>
        <ul class="order-items-list">
          ${order.items.map(item => `
            <li>${item.name} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>
          `).join('')}
        </ul>
        <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
      </div>
      ${order.status === 'completed' ? `
        <div class="order-actions">
          <button class="edit-order-btn" onclick="editOrder(${order.id})">Editar</button>
          <button class="delete-order-btn" onclick="showDeleteConfirmation(${order.id})">Eliminar</button>
          ${!order.archived ? `
            <button class="archive-btn" onclick="showArchiveConfirmation(${order.id})">Archivar</button>
          ` : `
            <button class="unarchive-btn" onclick="showUnarchiveConfirmation(${order.id})">Desarchivar</button>
          `}
        </div>
      ` : ''}
    `;
    return orderCard;
  }

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

  function addOrderToDisplay(order) {
    const orderCard = createOrderCard(order);
    const targetSection = document.querySelector(`#${order.status} .orders-container`);
    if (targetSection) {
      targetSection.prepend(orderCard);
    }
    
    if (order.status === 'completed') {
      const currentBalance = parseFloat(localStorage.getItem('currentBalance') || '0');
      const newBalance = currentBalance + order.total;
      localStorage.setItem('currentBalance', newBalance);
      document.getElementById('totalSales').textContent = `$${newBalance.toFixed(2)}`;
    }
    
    updateOrderCount();
    saveData();
  }

  function updateOrderCount() {
    const activeOrders = orders.filter(order => order.status !== 'completed').length;
    document.getElementById('totalOrders').textContent = activeOrders;
  }

  const inventoryGrid = document.getElementById('inventoryGrid');

  window.addInventoryItem = (product) => {
    const item = document.createElement('div');
    item.className = 'inventory-item small';
    item.dataset.id = product.id;
    item.innerHTML = `
      <img src="${product.imageUrl}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/150'" ondblclick="openGallery(${product.id})">
      <div class="inventory-item-details">
        <h3>${product.name}</h3>
        <p>Precio de compra: $${product.buyPrice.toFixed(2)}</p>
        <p>Precio de venta: $${product.sellPrice.toFixed(2)}</p>
        <p>Cantidad: ${product.quantity}</p>
        <p>Ganancia por unidad: $${(product.sellPrice - product.buyPrice).toFixed(2)}</p>
      </div>
      <div class="inventory-item-options">
        <button class="delete-btn" onclick="confirmDelete(${product.id})">Eliminar</button>
        <button class="edit-btn" onclick="confirmEdit(${product.id})">Editar</button>
      </div>
    `;
    inventoryGrid.appendChild(item);
  }

  window.deleteProduct = (id) => {
    const index = inventory.findIndex(p => p.id === id);
    if (index > -1) {
      inventory.splice(index, 1);
      updateInventoryGrid();
      updateTotalProductsCount();
      saveData();
      document.querySelector('.floating-confirm')?.remove();
    }
  };

  window.confirmDelete = (id) => {
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'floating-confirm';
    confirmDiv.innerHTML = `
      <div class="floating-confirm-content">
        <h3>Confirmar Eliminación</h3>
        <p>¿Estás seguro de que deseas eliminar este producto?</p>
        <div class="confirm-buttons">
          <button onclick="deleteProduct(${id})" class="confirm-btn">Sí, Eliminar</button>
          <button onclick="this.closest('.floating-confirm').remove()" class="cancel-btn">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmDiv);
  };

  window.confirmEdit = (id) => {
    const product = inventory.find(p => p.id === id);
    if (product) {
      document.getElementById('editModal').style.display = 'block';
      const editForm = document.getElementById('editForm');
      editForm.productName.value = product.name;
      editForm.buyPrice.value = product.buyPrice;
      editForm.sellPrice.value = product.sellPrice;
      editForm.quantity.value = product.quantity;
      document.getElementById('imageUrlEdit').value = product.imageUrl;

      const saveProductBtn = document.getElementById('saveProductBtn');
      saveProductBtn.onclick = (e) => {
        e.preventDefault();
        const updatedProduct = {
          id: product.id,
          name: editForm.productName.value,
          buyPrice: parseFloat(editForm.buyPrice.value),
          sellPrice: parseFloat(editForm.sellPrice.value),
          quantity: parseInt(editForm.quantity.value) || 0,
          imageUrl: editForm.imageUrl.value || product.imageUrl 
        };

        const index = inventory.findIndex(p => p.id === product.id);
        if (index > -1) {
          inventory[index] = updatedProduct;
          updateInventoryGrid();
          updateTotalProductsCount();
          document.getElementById('editModal').style.display = 'none';
          saveData();
        }
      };
    }
  };

  function updateInventoryGrid() {
    inventoryGrid.innerHTML = '';
    inventory.forEach(product => {
      addInventoryItem(product);
    });
    updateTotalInvested();
  }

  function updateTotalProductsCount() {
    const totalProducts = inventory.reduce((sum, product) => sum + product.quantity, 0);
    document.getElementById('totalProducts').textContent = totalProducts;
    saveData();
  }

  const updateTotalInvested = () => {
    const totalInvested = inventory.reduce((sum, product) =>
      sum + (product.buyPrice * product.quantity), 0);
    
    document.getElementById('totalInvested').textContent = `$${(totalInvested).toFixed(2)}`;
  };

  const updateProductSelect = () => {
    const productSelect = document.getElementById('productSelect');
    productSelect.innerHTML = '<option value="">Seleccionar producto</option>';
    inventory.forEach(product => {
      if (product.quantity > 0) {
        productSelect.innerHTML += `
          <option value="${product.id}">${product.name} - $${product.sellPrice.toFixed(2)}</option>
        `;
      }
    });
  };

  window.openGallery = (productId) => {
    const product = inventory.find(p => p.id === productId);
    if (!product) return;

    const galleryModal = document.createElement('div');
    galleryModal.className = 'modal gallery-modal';
    galleryModal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Galería de ${product.name}</h2>
        <img src="${product.imageUrl}" alt="${product.name}" 
             onerror="this.src='https://via.placeholder.com/150'" 
             style="max-width: 100%; height: auto;"/>
      </div>
    `;
    document.body.appendChild(galleryModal);
    galleryModal.style.display = 'block';

    const closeBtn = galleryModal.querySelector('.close');
    closeBtn.onclick = () => {
      galleryModal.remove();
    };
  };

  function addImageToProduct(productId) {
    const newImageUrl = prompt("Ingrese la URL de la nueva imagen:");
    const product = inventory.find(p => p.id === productId);
    if (product && newImageUrl) {
      product.images = product.images || [];
      product.images.push(newImageUrl);
    }
    updateInventoryGrid();
  }

  function addTransaction(type, productName, quantity, price) {
    const transactionsBody = document.getElementById('transactionsBody');
    const newRow = document.createElement('tr');
    const totalPrice = price * quantity;
    newRow.innerHTML = `
      <td>${new Date().toLocaleDateString()}</td>
      <td>${type.charAt(0).toUpperCase() + type.slice(1)}</td>
      <td>${productName}</td>
      <td>${quantity}</td>
      <td>$${price.toFixed(2)}</td>
      <td>$${totalPrice.toFixed(2)}</td>
    `;
    transactionsBody.appendChild(newRow);
    updateDashboardStats();
  }

  function updateDashboardStats() {
    const totalInvested = inventory.reduce((sum, product) =>
      sum + (product.buyPrice * product.quantity), 0);

    const totalOrderSales = orders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + order.total, 0);

    const totalArchivedSales = archivedOrders
      .reduce((sum, order) => sum + order.total, 0);

    const totalWithdrawals = parseFloat(localStorage.getItem('totalWithdrawals') || '0');
    
    const currentBalance = parseFloat(localStorage.getItem('currentBalance')) || 
      (totalOrderSales + totalArchivedSales - totalWithdrawals);

    const totalItems = inventory.reduce((sum, product) =>
      sum + product.quantity, 0);

    document.getElementById('totalInvested').textContent = `$${totalInvested.toFixed(2)}`;
    document.getElementById('totalSales').textContent = `$${currentBalance.toFixed(2)}`;
    document.getElementById('totalProducts').textContent = totalItems;
  }

  function loadSavedData() {
    const savedOrders = localStorage.getItem('orders');
    const savedInventory = localStorage.getItem('inventory');
    const savedBalance = localStorage.getItem('currentBalance');
    
    document.querySelectorAll('.orders-container').forEach(container => {
      container.innerHTML = '';
    });
    
    if (savedOrders) {
      orders = JSON.parse(savedOrders);
      orders.forEach(order => addOrderToDisplay(order));
    }
    
    if (savedInventory) {
      inventory = JSON.parse(savedInventory);
      updateInventoryGrid();
    }
    
    if (savedBalance) {
      document.getElementById('totalSales').textContent = `$${parseFloat(savedBalance).toFixed(2)}`;
    }
    
    updateOrderCount();
    updateTotalProductsCount();
    updateTotalInvested();
  }

  function updateHTMLStructure() {
    const sections = ['in-progress', 'delivering', 'completed'];
    sections.forEach(section => {
      const sectionElement = document.getElementById(section);
      if (sectionElement && !sectionElement.querySelector('.orders-container')) {
        const container = document.createElement('div');
        container.className = 'orders-container';
        sectionElement.appendChild(container);
      }
    });
  }

  window.archiveOrder = (orderId) => {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex > -1) {
      const order = orders.splice(orderIndex, 1)[0];
      order.archived = true;
      archivedOrders.push(order);
      saveData();
      updateCompletedOrders();
      document.querySelector('.floating-confirm')?.remove();
    }
  };

  window.unarchiveOrder = (orderId) => {
    const orderIndex = archivedOrders.findIndex(o => o.id === orderId);
    if (orderIndex > -1) {
      const order = archivedOrders.splice(orderIndex, 1)[0];
      delete order.archived;
      order.status = 'completed'; 
      orders.push(order);
      saveData();
      updateCompletedOrders();
      document.querySelector('.floating-confirm')?.remove();
    }
  };

  window.deleteOrder = (orderId) => {
    let orderIndex = orders.findIndex(o => o.id === orderId);
    let targetArray = orders;
    
    if (orderIndex === -1) {
      orderIndex = archivedOrders.findIndex(o => o.id === orderId);
      targetArray = archivedOrders;
    }

    if (orderIndex > -1) {
      targetArray.splice(orderIndex, 1);
      saveData();
      const orderCard = document.querySelector(`.order-card[data-id="${orderId}"]`);
      if (orderCard) {
        orderCard.remove();
      }
      document.querySelector('.floating-confirm')?.remove();
    }
  };

  function updateCompletedOrders() {
    const completedContainer = document.querySelector('#completed .orders-container');
    if (!completedContainer) return;
    
    completedContainer.innerHTML = '';
    const ordersToShow = showingArchived ? 
      archivedOrders : 
      orders.filter(o => o.status === 'completed' && !o.archived);
  
    ordersToShow.forEach(order => {
      const orderCard = createOrderCard(order);
      completedContainer.appendChild(orderCard);
    });
  }

  document.getElementById('showActiveBtn').addEventListener('click', (e) => {
    e.preventDefault(); 
    showingArchived = false;
    document.getElementById('showArchivedBtn').classList.remove('active-filter');
    e.target.classList.add('active-filter');
    updateCompletedOrders();
    const completedTab = document.querySelector('.tab-btn[data-section="completed"]');
    if (!completedTab.classList.contains('active')) {
      completedTab.click();
    }
  });

  document.getElementById('showArchivedBtn').addEventListener('click', (e) => {
    e.preventDefault(); 
    showingArchived = true;
    document.getElementById('showActiveBtn').classList.remove('active-filter');
    e.target.classList.add('active-filter');
    updateCompletedOrders();
    const completedTab = document.querySelector('.tab-btn[data-section="completed"]');
    if (!completedTab.classList.contains('active')) {
      completedTab.click();
    }
  });

  window.showArchiveConfirmation = (orderId) => {
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'floating-confirm';
    confirmDiv.innerHTML = `
      <div class="floating-confirm-content">
        <h3>Confirmar Archivo</h3>
        <p>¿Deseas archivar este pedido?</p>
        <div class="confirm-buttons">
          <button onclick="archiveOrder(${orderId})" class="confirm-btn">Sí, Archivar</button>
          <button onclick="this.closest('.floating-confirm').remove()" class="cancel-btn">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmDiv);
  };

  window.showDeleteConfirmation = (orderId) => {
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'floating-confirm';
    confirmDiv.innerHTML = `
      <div class="floating-confirm-content">
        <h3>Confirmar Eliminación</h3>
        <p>¿Estás seguro de que deseas eliminar este pedido?</p>
        <div class="confirm-buttons">
          <button onclick="deleteOrder(${orderId})" class="confirm-btn">Sí, Eliminar</button>
          <button onclick="this.closest('.floating-confirm').remove()" class="cancel-btn">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmDiv);
  };

  window.showUnarchiveConfirmation = (orderId) => {
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'floating-confirm';
    confirmDiv.innerHTML = `
      <div class="floating-confirm-content">
        <h3>Confirmar Desarchivar</h3>
        <p>¿Deseas desarchivar este pedido?</p>
        <div class="confirm-buttons">
          <button onclick="unarchiveOrder(${orderId})" class="confirm-btn">Sí, Desarchivar</button>
          <button onclick="this.closest('.floating-confirm').remove()" class="cancel-btn">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmDiv);
  };

  window.editOrder = (orderId) => {
    const order = orders.find(o => o.id === orderId) || archivedOrders.find(o => o.id === orderId);
    if (!order) return;

    const editModal = document.getElementById('editOrderModal');
    const editForm = document.getElementById('editOrderForm');
    
    editForm.customerName.value = order.customer;
    editForm.customerPhone.value = order.phone;
    
    let currentEditItems = [...order.items];
    updateEditOrderSummary(currentEditItems);
    
    editForm.onsubmit = (e) => {
      e.preventDefault();
      order.customer = editForm.customerName.value;
      order.phone = editForm.customerPhone.value;
      order.items = currentEditItems;
      order.total = currentEditItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      saveData();
      updateOrderDisplay(order);
      editModal.style.display = 'none';
    };
    
    editModal.style.display = 'block';
  };

  function updateEditOrderSummary(items) {
    const orderItemsDiv = document.getElementById('editOrderItems');
    const orderTotalSpan = document.getElementById('editOrderTotal');
    
    orderItemsDiv.innerHTML = items.map((item, index) => `
      <div class="order-item">
        <span>${item.name} x ${item.quantity}</span>
        <span>$${(item.price * item.quantity).toFixed(2)}</span>
        <button type="button" class="remove-item" onclick="removeEditOrderItem(${index})">&times;</button>
      </div>
    `).join('');
    
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    orderTotalSpan.textContent = total.toFixed(2);
  }

  window.removeEditOrderItem = (index) => {
    const items = Array.from(document.querySelectorAll('#editOrderItems .order-item'));
    if (items[index]) {
      items[index].remove();
      updateEditOrderSummary(items);
    }
  };

  function updateOrderDisplay(order) {
    const orderCard = document.querySelector(`.order-card[data-id="${order.id}"]`);
    if (orderCard) {
      orderCard.remove();
    }
    addOrderToDisplay(order);
  }

  document.getElementById('showActiveBtn').classList.add('active-filter');
  updateCompletedOrders();
  
  updateHTMLStructure();
  loadSavedData();

  const tabsContainer = document.querySelector('.order-tabs');
  const invoiceTab = document.querySelector('[data-section="invoice-settings"]');
  if (invoiceTab) invoiceTab.remove();

  function populateDateSelectors() {
    const currentYear = new Date().getFullYear();
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Populate year selectors
    const yearSelectors = ['transactionYearSelect', 'statisticsYearSelect'];
    yearSelectors.forEach(selectorId => {
      const select = document.getElementById(selectorId);
      if (!select) return;
      
      for (let year = currentYear; year <= 2030; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        select.appendChild(option);
      }
      select.value = currentYear;
    });

    // Populate month selectors
    const monthSelectors = ['transactionMonthSelect', 'statisticsMonthSelect'];
    monthSelectors.forEach(selectorId => {
      const select = document.getElementById(selectorId);
      if (!select) return;
      
      months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        select.appendChild(option);
      });
      select.value = new Date().getMonth() + 1;
    });
  }

  function updateStatistics() {
    const year = document.getElementById('statisticsYearSelect').value;
    const month = document.getElementById('statisticsMonthSelect').value;
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Filter orders for the selected month
    const monthOrders = orders.filter(order => {
      const orderDate = new Date(order.date);
      return orderDate >= startDate && 
             orderDate <= endDate && 
             order.status === 'completed';
    });

    // Calculate statistics
    const totalSales = monthOrders.reduce((sum, order) => sum + order.total, 0);
    const dailyAvg = totalSales / endDate.getDate();

    // Get withdrawals for the month
    const monthWithdrawals = Array.from(document.getElementById('transactionsBody').getElementsByTagName('tr'))
      .filter(row => {
        const date = new Date(row.cells[0].textContent);
        return date >= startDate && 
               date <= endDate && 
               row.cells[1].textContent.toLowerCase().includes('retiro');
      })
      .reduce((sum, row) => sum + parseFloat(row.cells[5].textContent.replace('$', '')), 0);

    // Count products sold
    const productCounts = {};
    monthOrders.forEach(order => {
      order.items.forEach(item => {
        productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
      });
    });

    // Sort products by quantity sold
    const topProducts = Object.entries(productCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    // Update statistics display
    document.getElementById('monthSales').textContent = `$${totalSales.toFixed(2)}`;
    document.getElementById('monthWithdrawals').textContent = `$${monthWithdrawals.toFixed(2)}`;
    document.getElementById('avgDailySales').textContent = `$${dailyAvg.toFixed(2)}`;
    
    document.getElementById('topProducts').innerHTML = topProducts
      .map(([name, qty]) => `
        <div class="top-product-item">
          <span>${name}</span>
          <span>${qty} unidades</span>
        </div>
      `).join('');

    updateSalesChart(monthOrders, startDate, endDate);
  }

  function updateSalesChart(orders, startDate, endDate) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    // Create daily sales data
    const dailySales = {};
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dailySales[d.getDate()] = 0;
    }

    orders.forEach(order => {
      const day = new Date(order.date).getDate();
      dailySales[day] += order.total;
    });

    if (window.salesChart) {
      window.salesChart.destroy();
    }

    window.salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Object.keys(dailySales),
        datasets: [{
          label: 'Ventas Diarias',
          data: Object.values(dailySales),
          borderColor: '#ff6f61',
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(255, 111, 97, 0.1)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Ventas Diarias del Mes'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => `$${value}`
            }
          }
        }
      }
    });
  }

  function filterTransactions() {
    const year = document.getElementById('transactionYearSelect').value;
    const month = document.getElementById('transactionMonthSelect').value;
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const rows = document.getElementById('transactionsBody').getElementsByTagName('tr');
    Array.from(rows).forEach(row => {
      const date = new Date(row.cells[0].textContent);
      row.style.display = (date >= startDate && date <= endDate) ? '' : 'none';
    });
  }

  // Event listeners for date filters
  document.getElementById('transactionYearSelect').addEventListener('change', filterTransactions);
  document.getElementById('transactionMonthSelect').addEventListener('change', filterTransactions);
  document.getElementById('statisticsYearSelect').addEventListener('change', updateStatistics);
  document.getElementById('statisticsMonthSelect').addEventListener('change', updateStatistics);

  // Initialize date selectors and statistics
  populateDateSelectors();
  updateStatistics();
  filterTransactions();

  const transactionsHeader = document.querySelector('.transactions-header');
  const printTransactionsBtn = document.createElement('button');
  printTransactionsBtn.className = 'add-transaction-btn';
  printTransactionsBtn.style.background = 'var(--blue-color)';
  printTransactionsBtn.style.color = 'white';
  printTransactionsBtn.style.marginLeft = '10px';
  printTransactionsBtn.textContent = 'Imprimir Transacciones';
  transactionsHeader.appendChild(printTransactionsBtn);

  const monthSelector = document.createElement('select');
  monthSelector.id = 'transactionMonthSelect';
  monthSelector.className = 'transaction-month-select';
  
  printTransactionsBtn.addEventListener('click', printTransactions);

  function printTransactions() {
    const selectedMonth = document.getElementById('transactionMonthSelect').value;
    const [year, month] = selectedMonth.split('-');
    
    // Get all transactions from the table
    const transactions = Array.from(document.getElementById('transactionsBody').getElementsByTagName('tr'))
      .filter(row => {
        const date = new Date(row.cells[0].textContent);
        return date.getFullYear() === parseInt(year) && 
               (date.getMonth() + 1) === parseInt(month);
      });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Registro de Transacciones - ${new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            .header { margin-bottom: 20px; }
            .summary { margin-top: 20px; }
            @media print {
              button { display: none; }
            }
            .transaction-type {
              padding: 4px 8px;
              border-radius: 4px;
              font-weight: 500;
            }
            .transaction-retiro {
              background-color: #fee2e2;
              color: #991b1b;
            }
            .no-transactions {
              text-align: center;
              padding: 20px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Registro de Transacciones</h2>
            <p>Período: ${new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
          </div>
          ${transactions.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio Unitario</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map(row => `
                  <tr>
                    <td>${row.cells[0].textContent}</td>
                    <td>
                      <span class="transaction-type ${row.cells[1].textContent.toLowerCase().includes('retiro') ? 'transaction-retiro' : ''}">
                        ${row.cells[1].textContent}
                      </span>
                    </td>
                    <td>${row.cells[2].textContent}</td>
                    <td>${row.cells[3].textContent}</td>
                    <td>${row.cells[4].textContent}</td>
                    <td>${row.cells[5].textContent}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="summary">
              <p><strong>Total de Transacciones:</strong> ${transactions.length}</p>
              <p><strong>Total en Retiros:</strong> $${transactions
                .filter(row => row.cells[1].textContent.toLowerCase().includes('retiro'))
                .reduce((sum, row) => sum + parseFloat(row.cells[5].textContent.replace('$', '')), 0)
                .toFixed(2)}</p>
            </div>
          ` : `
            <div class="no-transactions">
              <p>No hay transacciones registradas para este período</p>
            </div>
          `}
          <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px;">Imprimir</button>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  document.getElementById('clearInvestedButton').addEventListener('click', () => {
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'floating-confirm';
    confirmDiv.innerHTML = `
      <div class="floating-confirm-content">
        <h3>Confirmar Limpieza</h3>
        <p>¿Estás seguro de que deseas limpiar el dinero invertido?</p>
        <div class="confirm-buttons">
          <button onclick="clearInvestedMoney()" class="confirm-btn">Sí, Limpiar</button>
          <button onclick="this.closest('.floating-confirm').remove()" class="cancel-btn">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmDiv);
  });

  window.clearInvestedMoney = () => {
    inventory.forEach(product => {
      product.buyPrice = 0;
    });
    updateTotalInvested();
    saveData();
    document.querySelector('.floating-confirm').remove();
  };

  document.getElementById('printInventoryButton').addEventListener('click', () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Inventario</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            .header { margin-bottom: 20px; }
            .total { margin-top: 20px; font-weight: bold; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Reporte de Inventario</h2>
            <p>Fecha: ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio de Compra</th>
                <th>Precio de Venta</th>
                <th>Valor Total</th>
              </tr>
            </thead>
            <tbody>
              ${inventory.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.buyPrice.toFixed(2)}</td>
                  <td>$${item.sellPrice.toFixed(2)}</td>
                  <td>$${(item.buyPrice * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            <p>Total de Productos: ${inventory.reduce((sum, item) => sum + item.quantity, 0)}</p>
            <p>Valor Total del Inventario: $${inventory.reduce((sum, item) => sum + (item.buyPrice * item.quantity), 0).toFixed(2)}</p>
          </div>
          <button onclick="window.print()">Imprimir</button>
        </body>
      </html>
    `);
    printWindow.document.close();
  });

  const chartScript = document.createElement('script');
  chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
  document.head.appendChild(chartScript);

  // Trigger initial statistics update when the page loads
  const statisticsTab = document.querySelector('.tab-btn[data-section="statistics"]');
  if (statisticsTab) {
    statisticsTab.addEventListener('click', () => {
      updateStatistics();
    });

    // Trigger initial statistics update
    updateStatistics();
  }
  
  updateTotalProductsCount();
});