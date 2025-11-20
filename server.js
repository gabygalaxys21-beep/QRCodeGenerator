const express = require('express');
const path = require('path');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const PORT = process.env.PORT || 3000;

// In-memory store for demo/testing. Replace with DB for production.
const store = new Map();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// Home / form
app.get('/', (req, res) => {
  res.render('index', { qrDataUrl: null, profileUrl: null, preview: null });
});

// Handle form submit
app.post('/create', async (req, res) => {
  try {
    const { fullname, email, phone, instagram, linkedin } = req.body;

    // Basic validation (extend as needed)
    if (!fullname || !email) {
      return res.status(400).send('Full name and email are required.');
    }

    // Create id and store
    const id = uuidv4();
    const profile = {
      id,
      fullname,
      email,
      phone,
      instagram: instagram || '',
      linkedin: linkedin || '',
      createdAt: new Date().toISOString()
    };
    store.set(id, profile);

    // Build absolute URL to profile
    const host = req.headers.host; // includes port
    const protocol = req.headers['x-forwarded-proto'] || req.protocol; // http or https
    const profileUrl = `${protocol}://${host}/p/${id}`;

    // Generate QR code (data URL)
    const qrDataUrl = await QRCode.toDataURL(profileUrl, { errorCorrectionLevel: 'H', scale: 8 });

    // Render index with QR preview
    res.render('index', { qrDataUrl, profileUrl, preview: profile });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Serve profile page
app.get('/p/:id', (req, res) => {
  const id = req.params.id;
  const profile = store.get(id);
  if (!profile) return res.status(404).send('Profile not found.');

  res.render('profile', { profile });
});

// Optional: endpoint to return vCard text (if you want)
app.get('/p/:id/vcard', (req, res) => {
  const id = req.params.id;
  const p = store.get(id);
  if (!p) return res.status(404).send('Profile not found.');
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${p.fullname}`,
    p.phone ? `TEL;TYPE=CELL:${p.phone}` : '',
    `EMAIL:${p.email}`,
    p.linkedin ? `URL:${p.linkedin}` : '',
    p.instagram ? `URL:${p.instagram}` : '',
    'END:VCARD'
  ].filter(Boolean);
  res.set('Content-Type', 'text/vcard; charset=utf-8');
  res.send(lines.join('\r\n'));
});

app.listen(PORT, () => {
  console.log(`QR Profile app listening at http://localhost:${PORT}`);
});
