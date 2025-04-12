const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Google Places API endpoint and API key
const GOOGLE_PLACES_API_URL = "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Helper function to make Google Places API request
const searchPlaces = async (query) => {
  console.log(`Making request to Google Places API for query: ${query}`);
  try {
    const response = await axios.post(GOOGLE_PLACES_API_URL, 
      { textQuery: query },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.priceLevel,places.regularOpeningHours'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error in searchPlaces:', error.response?.data || error.message);
    throw error;
  }
};

// Endpoint for ai-microservice to get places
app.get('/api/places', async (req, res) => {
  try {
    const { location, type } = req.query;
    
    console.log('Received GET request with params:', { location, type });
    
    if (!location || !type) {
      console.log('Missing required parameters');
      return res.status(400).json({ 
        error: "Missing required parameters",
        received: { location, type },
        method: 'GET'
      });
    }

    const query = `${type} in ${location}`;
    console.log('Making search request with query:', query);
    
    const data = await searchPlaces(query);
    
    console.log('Received response from Google Places API');
    console.log('Number of places found:', data.places?.length || 0);

    if (!data.places) {
      console.log('No results found in Google Places API response');
      return res.json({ results: [] });
    }

    // Transform the response to match what ai-microservice expects
    const places = data.places.map(place => ({
      name: place.displayName?.text || place.displayName || 'Unknown',
      address: place.formattedAddress || 'No address available',
      rating: place.rating || 0,
      types: place.types || [],
      price_level: place.priceLevel || 0
    }));

    console.log(`Successfully processed ${places.length} places`);
    res.json({ results: places });
  } catch (error) {
    console.error('Error in /api/places endpoint:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch places',
      details: error.response?.data || error.message
    });
  }
});

app.post('/search', async (req, res) => {
  const { textQuery } = req.body;
  if (!textQuery) {
    return res.status(400).json({ error: "Missing 'textQuery' parameter" });
  }

  const payload = { textQuery };

  try {
    const response = await axios.post(GOOGLE_PLACES_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.priceLevel,places.regularOpeningHours'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error making request to Google Places API:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server on the specified port (default: 5000)
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
