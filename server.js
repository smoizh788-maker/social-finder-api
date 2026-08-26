const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Home route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Social Finder API is running'
  });
});

// Search route
app.post('/search', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Username or profile URL is required'
      });
    }

    const cleanQuery = query
      .trim()
      .replace('@', '')
      .replace(/\s/g, '');

    // Abhi empty results — next step mein approved/public
    // data source integration add hogi
    res.json({
      success: true,
      query: cleanQuery,
      results: []
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Social Finder API running on port ${PORT}`);
});
