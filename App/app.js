var noOfTables = 3;

var menuItems = [];
var tables = [];

var modalTarget;

// ----------------- FETCHING DATA -------------------------

function fetchMenuItems(){
    fetch('http://localhost:3000/menu').then((response) => { 
        response.text().then((json) => {
            menuItems = JSON.parse(json);
        }).then((val) => {
            searchMenuItems("");
        });
    });
}


// ------------------ INITIALIZATION -----------------------

function makePage(){
    makeTables();
    fetchMenuItems();

    document.dispatchEvent(new Event('updateContent'));
}


// ------------------ EVENTS -------------------------------

document.addEventListener('show.bs.modal', (e) => {
    modalTarget = e.relatedTarget;
    e.relatedTarget.classList.add("bg-warning");

    let id = e.relatedTarget.id.substring(e.relatedTarget.id.indexOf("-") + 1);

    e.target.querySelector("[id='modal-title-label']").innerText = "Table " + id + " | Order Summary";

    createOrderSummaryList(id);
});

document.addEventListener('hide.bs.modal', (e) => {
    modalTarget.classList.remove("bg-warning");
});

document.addEventListener('updateContent', (e) => {
    searchTables("");
    searchMenuItems("");
});

window.addEventListener('load', (e) => {
    console.log("Making page");
    makePage();
});

// ----------------------- DOM Manipulation -------------------------------

function createMenuItemCard(menuItem){

    let newEntry = document.createElement('div');
    newEntry.className = "card";
    newEntry.draggable = true;

    let cardBody = document.createElement("div");
    cardBody.className = "card-body";

    newEntry.ondragstart = event => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", JSON.stringify(menuItem));
    }

    newEntry.appendChild(cardBody);

    cardBody.innerHTML = `
            <h5 class="card-title">${menuItem['name']}</h5>
            <span class="col-6 card-text">Rs ${menuItem['cost']}</span>
    `;

    return newEntry;
}

function createTableItemCard(tableItem){

    let totalPrice = calculateTotal(...tableItem['orders']);
    let totalQty = totalQuantity(...tableItem['orders'])

    let newEntry = document.createElement('div');
    newEntry.id = "table-" + tableItem['id'];
    newEntry.className = "card";

    newEntry.setAttribute("data-bs-toggle", "modal");
    newEntry.setAttribute("data-bs-target", "#order-summary");

    newEntry.ondragover = event => {
        event.preventDefault();
    }

    newEntry.addEventListener('drop', (event) => {
        let menuItem = JSON.parse(event.dataTransfer.getData("text/plain"));

        addMenuItemToTable(menuItem['id'], tableItem['id']);

        document.dispatchEvent(new Event("updateContent"));

        event.stopPropagation();
    }, false);

    newEntry.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">${tableItem['name']}</h5>
            <div class="card-footer row justify-content-between">
                <span class="col-6 card-text" id="table-${tableItem['id']}-price">Rs ${totalPrice}</span>
                <span class="col-6 card-text" id="table-${tableItem['id']}-qty">Qty : ${totalQty}</span>
            </div>
        </div>
    `;

    return newEntry;
}

function createOrderSummaryList(tableId){
    
    let modalBodyDiv = document.querySelector('[id="order-summary-items-list"');

    modalBodyDiv.innerHTML = "";
    modalBodyDiv.classList.add("table-responsive");

    let table = document.createElement("table");
    table.className = "table";

    let tableItem = tables[tableId-1];

    table.innerHTML = `
        <thead>
            <tr>
                <th scope="col">S.No</th>
                <th scope="col">Item</th>
                <th scope="col">Price</th>
                <th scope="col">Quantity</th>
                <th scope="col">Action</th>
            </tr>
        </thead>
        `;

        let tbody = "<tbody>";

        tableItem['orders'].forEach((order, index) => {

            let tr = "<tr>";
            let menuItem = getMenuItem(order['id']);

            tr += "<td>" + (index + 1) + "</td>";
            tr += "<td>" + menuItem['name'] + "</td>";
            tr += "<td>" + menuItem['cost'] + "</td>";
            tr += `<td>
                        <input value="${order['qty']}" type="number" />
                        <button class="btn btn-sm" onclick="removeMenuItemFromTable(${menuItem['id']}, ${tableItem['id']})">
                            <i class="fa fa-minus"></i>
                        </button>
                        <button class="btn btn-sm" onclick="addMenuItemToTable(${menuItem['id']}, ${tableItem['id']})">
                            <i class="fa fa-plus"></i>
                        </button>
                    </td>`;
            tr += `<td>
                        <button class="btn btn-sm" onclick="deleteOrderMenuItem(${tableItem['id']}, ${order['id']})">
                            <i style="font-size:24px" class="fa">&#xf014;</i>
                        </button>
                    </td>`;

            tr += "</tr>";

            tbody += tr;

        });

        tbody += `
                <tr>
                    <td></td>
                    <th>Total Price : </th>
                    <td>${calculateTotal(...tableItem['orders'])}</td>
                    <td></td>
                    <td></td>
                </tr>
        `;
        
        tbody += "</tbody>";
    
        table.innerHTML += tbody;

    modalBodyDiv.appendChild(table);

    document.getElementById("order-summary-clear-session-button").onclick = function(e){
        tableItem['orders'] = [];
        document.dispatchEvent(new Event("updateContent"));
    };
}

// ----------------------- ADD/REMOVE of ORDERS ----------------------------

function addMenuItemToTable(menuId, tableId){

    let menuItem = getMenuItem(menuId);
    let tableItem = tables[tableId - 1];

    console.log("Adding Menu Item", menuItem, tableItem);

    let index = getOrderIndex(tableItem['orders'], menuItem['id']);
    if(index == -1){
        tableItem['orders'].push({
            "id": menuItem['id'],
            "qty": 1
        });
    }

    else{
        tableItem['orders'][index]['qty']++;
    }

    createOrderSummaryList(tableItem['id']);
    document.dispatchEvent(new Event("updateContent"));
}

function removeMenuItemFromTable(menuId, tableId){
    
    let menuItem = getMenuItem(menuId);
    let tableItem = tables[tableId - 1];

    console.log("Removing Menu Item");

    let index = getOrderIndex(tableItem['orders'], menuItem['id']);
    if(index == -1){
        tableItem['orders'].push({
            "id": menuItem['id'],
            "qty": 1
        });
    }

    else{
        tableItem['orders'][index]['qty']--;

        if(tableItem['orders'][index]['qty'] == 0){
            deleteOrderMenuItem(tableItem['id'], tableItem['orders'][index]['id']);
        }
    }

    createOrderSummaryList(tableItem['id']);
    document.dispatchEvent(new Event("updateContent"));
}

function deleteOrderMenuItem(tableId, orderId){

    let tableItem = tables[tableId - 1];
    let orderIdx = -1;

    tableItem['orders'].forEach((order, index) => {
        if(order['id'] == orderId)
            orderIdx = index;
    });

    if(orderIdx >= 0)
        tableItem['orders'].splice(orderIdx, 1);

    createOrderSummaryList(tableId);
    document.dispatchEvent(new Event("updateContent"));
}

// ------------------------- SEARCH FUNCTIONALITY -----------------------------

function searchMenuItems(value){
    
    let listOfMenuItems;
    let menuListElement = document.getElementById("menu-list");
    menuListElement.innerHTML = "";

    if(value == "")
        listOfMenuItems = menuItems;
    else
        listOfMenuItems = filterMenuItems(value);

    console.log(listOfMenuItems);

    listOfMenuItems.forEach(element => {
        menuListElement.appendChild(createMenuItemCard(element));
    });
}

function searchTables(value){
    
    let listOfTables;
    let tableListElement = document.getElementById("table-list");
    tableListElement.innerHTML = "";

    if(value == "")
        listOfTables = tables;
    else
        listOfTables = filterTables(value);

    listOfTables.forEach(element => {
        tableListElement.appendChild(createTableItemCard(element));
    });
}

// ---------------------- UTILITY FUNCTIONS -----------------------------

function getOrderIndex(orders, id){
    let index = -1;
    orders.forEach((element, idx) => {
        if(element['id'] == id)
            index = idx;
    });
    return index;
}

function totalQuantity(...items){
    let totalQty = 0;
    for(let item of items){
        totalQty += item['qty'];
    }

    return totalQty;
}

function calculateTotal(...items){
    let totalPrice = 0;
    for(let item of items){
        totalPrice += getMenuItem(item['id'])['cost'] * item['qty'];
    }
    return totalPrice;
}

function getMenuItem(id){
    return menuItems.filter((val) => val['id'] == id)[0];
}

function filterTables(query){
    return tables.filter((value) => value['name'].toLowerCase().includes(query.toLowerCase()));
}

function filterMenuItems(query){
    return menuItems
            .filter((value) => 
                     value['name'].toLowerCase().includes(query.toLowerCase()) 
                     || 
                     value['type'].toLowerCase().includes(query.toLowerCase())
                );
}

function makeTables(){
    for(let i=0;i<noOfTables;i++){
        tables.push({
            "id": i + 1,
            "name" : "Table " + (i + 1),
            "orders": []
        });
    }
}


