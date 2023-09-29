const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;

// Function to scrape the HTML content from a single URL
async function scrapeHTML(url) {
  const browser = await puppeteer.launch({
    headless: 'false'
  });
  const page = await browser.newPage();

  // Increase the navigation timeout to 60 seconds (you can adjust this as needed)
  await page.goto(url, { timeout: 90000 }); // 60 seconds

  // Extract the value from the span element with the specified ID
  const value = await page.$eval('#inp_nse > div > div.inindi_price.testingClass > div > div.indimprice > div.inprice1 > span', (element) => {
    return element.getAttribute('data-numberanimate-value');
  });

  // Close the browser
  await browser.close();

  // Extract the part of the URL you want
  const urlParts = url.split('/');
  const urlPart = urlParts[urlParts.length - 1].slice(0, -5); // Extracts the part after the last '/' and before the first '-'

  return { url: urlPart, value };
}

// Define a route for your API that accepts a list of URL names as a query parameter
app.get('/', async (req, res) => {
  try {
    const { urls } = req.query; // Get the list of URL names as a comma-separated string

    if (!urls) {
      res.status(400).send('Please provide a list of URL names');
      return;
    }

    const urlList = urls.split(','); // Split the comma-separated string into an array of URL names

    // Scrape data from all URLs in parallel
    const scrapingTasks = urlList.map(async (urlName) => {
      // Construct the full URL by appending the extracted name to the base URL
      const url = `https://www.moneycontrol.com/indian-indices/${urlName}.html`;
      const data = await scrapeHTML(url);
      return data;
    });

    const scrapedData = await Promise.all(scrapingTasks);
    const currentTime = new Date().toLocaleString();

    // Construct the response HTML with CSS styles for the table
    const responseHTML = `
      <html>
        <head>
          <style>
            table {
              width: 80%;
              border-collapse: collapse;
              margin: 20px auto;
            }
            th, td {
              border: 1px solid #dddddd;
              text-align: left;
              padding: 8px;
            }
            th {
              background-color: #f2f2f2;
            }
            tr:nth-child(even) {
              background-color: #f2f2f2;
            }
          </style>
        </head>
        <body>
          <table>
            <tr>
              <th>Fund Name</th>
              <th>Value</th>
              <th>Timestamp</th>
            </tr>
            ${scrapedData.map(({ url, value }) => `
              <tr>
                <td>${url}</td>
                <td>${value}</td>
                <td>${currentTime}</td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
    `;

    // Send the response
    res.send(responseHTML);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://127.0.0.1:${port}`);
});
