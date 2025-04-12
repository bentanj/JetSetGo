const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Environment variables
const PORT = process.env.PORT || 5400;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ITINERARIES_TABLE = process.env.ITINERARIES_TABLE || 'itineraries';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// JWT Authentication middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    console.log("JWT Payload:", payload);
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Save an itinerary
app.post('/api/itineraries', authenticateJWT, async (req, res) => {
  try {
    const { itinerary, travelDetails } = req.body;
    
    if (!itinerary || !travelDetails) {
      return res.status(400).json({ error: 'Missing itinerary or travel details' });
    }
    
    console.log("\n=== Starting itinerary save ===");
    console.log("Table name:", ITINERARIES_TABLE);
    console.log("User ID:", req.user.user_id);
    console.log("Travel Details:", JSON.stringify(travelDetails, null, 2));
    
    const itineraryData = {
      userID: req.user.user_id,
      // Store the destination exactly as received without fallbacks
      travelDestination: travelDetails.destination,
      startDate: travelDetails.startDate || travelDetails.start_date,
      endDate: travelDetails.endDate || travelDetails.end_date,
      travellers: travelDetails.numTravelers || travelDetails.number_of_travelers,
      budget: travelDetails.budget,
      dailyStartTime: travelDetails.dailyStartTime || travelDetails.daily_start_time,
      dailyEndTime: travelDetails.dailyEndTime || travelDetails.daily_end_time,
      geminiResponse: JSON.stringify({
        itinerary: itinerary,
        travelDetails: travelDetails
      }),
      createdAt: new Date().toISOString()
    };
    
    console.log("\nPrepared data for insert:", JSON.stringify(itineraryData, null, 2));
    console.log("\nAttempting to save itinerary...");
    
    const { data, error } = await supabase
      .from(ITINERARIES_TABLE)
      .insert(itineraryData)
      .select();
    
    if (error) {
      console.error('\nError saving itinerary:');
      console.error('Error object:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      return res.status(500).json({ 
        error: 'Failed to save itinerary', 
        details: error,
        attempted_data: itineraryData 
      });
    }
    
    console.log("\nItinerary saved successfully!");
    console.log("Saved data:", data);
    
    return res.status(201).json({
      message: 'Itinerary saved successfully',
      itinerary: data[0]
    });
  } catch (error) {
    console.error('\nServer error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    });
  }
});

// Get all itineraries for a user
app.get('/api/itineraries', authenticateJWT, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(ITINERARIES_TABLE)
      .select('*')
      .eq('userID', req.user.user_id)
      .order('createdAt', { ascending: false });
    
    if (error) {
      console.error('Error fetching itineraries:', error);
      return res.status(500).json({ error: 'Failed to fetch itineraries', details: error });
    }
    
    return res.status(200).json({
      message: 'Itineraries fetched successfully',
      itineraries: data
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get a specific itinerary by ID
app.get('/api/itineraries/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching itinerary with ID: ${id}`);
    
    const { data, error } = await supabase
      .from(ITINERARIES_TABLE)
      .select('*')
      .eq('itineraryID', id)
      .eq('userID', req.user.user_id)
      .single();
    
    if (error) {
      console.error('Error fetching itinerary:', error);
      return res.status(404).json({ error: 'Itinerary not found', details: error });
    }
    
    if (!data) {
      console.log('No data found for itinerary');
      return res.status(404).json({ error: 'Itinerary not found' });
    }
    
    console.log('Itinerary data found:', {
      itineraryID: data.itineraryID,
      userID: data.userID,
      travelDestination: data.travelDestination,
      geminiResponseLength: data.geminiResponse ? data.geminiResponse.length : 0,
      hasGeminiResponse: !!data.geminiResponse
    });
    
    // Parse the geminiResponse to get the original itinerary and travel details
    let parsedGeminiResponse = {};
    if (data.geminiResponse) {
      try {
        parsedGeminiResponse = JSON.parse(data.geminiResponse);
      } catch (parseError) {
        console.error('Error parsing geminiResponse:', parseError);
      }
    }

    // Construct the response with both database fields and gemini response
    const responseData = {
      ...data,
      travelDetails: {
        // Return the full destination as stored
        destination: data.travelDestination,
        startDate: data.startDate,
        endDate: data.endDate,
        numberOfTravelers: data.travellers,
        budget: data.budget,
        dailyStartTime: data.dailyStartTime,
        dailyEndTime: data.dailyEndTime
      },
      itinerary: parsedGeminiResponse.itinerary || []
    };

    return res.status(200).json({
      message: 'Itinerary fetched successfully',
      itinerary: responseData
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Delete an itinerary
app.delete('/api/itineraries/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if the itinerary belongs to the user
    const { data: checkData, error: checkError } = await supabase
      .from(ITINERARIES_TABLE)
      .select('itineraryID')
      .eq('itineraryID', id)
      .eq('userID', req.user.user_id)
      .single();
    
    if (checkError || !checkData) {
      console.error('Error checking itinerary ownership:', checkError);
      return res.status(404).json({ 
        error: 'Itinerary not found or you do not have permission to delete it',
        details: checkError
      });
    }
    
    // Proceed with deletion
    const { error: deleteError } = await supabase
      .from(ITINERARIES_TABLE)
      .delete()
      .eq('itineraryID', id)
      .eq('userID', req.user.user_id);
    
    if (deleteError) {
      console.error('Error deleting itinerary:', deleteError);
      return res.status(500).json({ 
        error: 'Failed to delete itinerary', 
        details: deleteError 
      });
    }
    
    return res.status(200).json({
      message: 'Itinerary deleted successfully'
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Delete all itineraries for a user
app.delete('/api/itineraries/:userID/all', authenticateJWT, async (req, res) => {
  try {
    const { userID } = req.params;

    // Convert both IDs to strings for comparison since they might be different types
    if (String(userID) !== String(req.user.user_id)) {
      return res.status(403).json({
        error: 'Unauthorized: Cannot delete itineraries for other users'
      });
    }

    console.log(`Attempting to delete all itineraries for user: ${userID}`);
    
    // Delete all itineraries for the user
    const { error: deleteError } = await supabase
      .from(ITINERARIES_TABLE)
      .delete()
      .eq('userID', userID);
    
    if (deleteError) {
      console.error('Error deleting itineraries:', deleteError);
      return res.status(500).json({
        error: 'Failed to delete itineraries',
        details: deleteError
      });
    }
    
    return res.status(200).json({
      message: 'All itineraries deleted successfully'
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Itinerary Microservice running on port ${PORT}`);
});
