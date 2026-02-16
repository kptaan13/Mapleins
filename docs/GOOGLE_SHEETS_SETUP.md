# Save Waitlist to Google Sheets

To save waitlist signups to your Google Sheet, set up a Google Apps Script web app.

## 1. Open your spreadsheet

Open: https://docs.google.com/spreadsheets/d/1QREerydO5kYFXLYV0qQP2dtjFxjHxxq_AODNdnLwR88/

## 2. Add headers (if needed)

In the first row, add these column headers:
| Timestamp | Email | Name | Role | City | Intake | Country | Source |

## 3. Create the Apps Script

1. Go to **Extensions** → **Apps Script**
2. Delete any placeholder code
3. Paste this script:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openById('1QREerydO5kYFXLYV0qQP2dtjFxjHxxq_AODNdnLwR88').getSheets()[0];

    const row = [
      data.timestamp || new Date().toISOString(),
      data.email || '',
      data.name || '',
      data.role || '',
      data.city || '',
      data.intake || '',
      data.country || 'India',
      data.source || 'waitlist_page'
    ];

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Click **Save** (Ctrl+S)

## 4. Deploy as web app

1. Click **Deploy** → **New deployment**
2. Click the gear icon → **Web app**
3. Description: `Mapleins Waitlist`
4. **Execute as**: Me (your account)
5. **Who has access**: Anyone
6. Click **Deploy**
7. Copy the **Web app URL** (looks like `https://script.google.com/macros/s/xxxxx/exec`)

## 5. Add to your project

Add the URL to `.env.local`:

```
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_ID/exec
```

Restart your dev server and redeploy. Waitlist signups will be appended to your sheet.
