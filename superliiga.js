let products = []; // Start with an empty array

// 1. Fetch the data from the external JSON file
async function loadDatabase() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error("Failed to load data");
        
        products = await response.json(); // Parse JSON and save to our variable
        displayTable(products);           // Initial render
    } catch (error) {
        console.error("Error loading JSON:", error);
    }
}

// 2. Function to render the data to the HTML table
function displayTable(data) {
    const tableBody = document.getElementById('database-content');
    tableBody.innerHTML = ""; 

    data.forEach(item => {
        let row = `<tr>
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>$${item.price}</td>
        </tr>`;
        tableBody.innerHTML += row;
    });
}

// 3. Function to sort the data
function sortData(key) {
    products.sort((a, b) => {
        // Handle sorting for both strings and numbers
        if (a[key] < b[key]) return -1;
        if (a[key] > b[key]) return 1;
        return 0;
    });

    displayTable(products);
}

// Initialize the app
loadDatabase();