// app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

// Initialize the Google Generative AI client with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Initialize Gemini model
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Places microservice URL
const PLACES_MICROSERVICE_URL = process.env.PLACES_MICROSERVICE_URL || 'http://localhost:4500';

// Price level mapping
const PRICE_LEVEL_MAPPING = {
  LOW: ['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE'],
  MEDIUM: ['PRICE_LEVEL_MODERATE'],
  HIGH: ['PRICE_LEVEL_EXPENSIVE'],
  VERY_HIGH: ['PRICE_LEVEL_VERY_EXPENSIVE']
};

/**
 * Get user preferences from User microservice
 */
const getUserPreferences = async (req) => {
  try {
    // Extract user ID from JWT token
    const token = req.headers.authorization;
    if (!token) {
      console.log('No authorization token provided');
      throw new Error('No authorization token provided');
    }

    // Get user ID from JWT token
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    const userID = decoded.user_id;
    console.log(`\n====== USER PREFERENCES DEBUG ======`);
    console.log(`JWT decoded: ${JSON.stringify(decoded)}`);
    console.log(`User ID from token: ${userID}`);

    // Call user microservice to get preferences
    const userServiceUrl = process.env.USER_SERVICE_URL;
    console.log(`Calling user service at ${userServiceUrl}/api/user/${userID}/taste-preferences`);
    
    const response = await axios.get(`${userServiceUrl}/api/user/${userID}/taste-preferences`, {
      headers: {
        'Authorization': token
      }
    });

    console.log(`User service response status: ${response.status}`);
    console.log(`User service response data: ${JSON.stringify(response.data, null, 2)}`);
    
    const preferences = response.data.taste_preferences;
    console.log(`Extracted preferences: ${JSON.stringify(preferences, null, 2)}`);
    
    // Map the preferences to the format expected by the AI service
    const mappedPreferences = {
      travelStyle: preferences.travel_style || ["Active"],
      travelSites: preferences.tourist_sites || ["Nature Sites"],
      diet: preferences.diet || ["None"],
      startTime: preferences.start_time || "08:30",
      endTime: preferences.end_time || "22:00"
    };
    
    console.log(`Mapped preferences: ${JSON.stringify(mappedPreferences, null, 2)}`);
    console.log(`====== END USER PREFERENCES DEBUG ======\n`);
    
    return mappedPreferences;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
      console.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error.message);
    }
  }
};

/**
 * Process location data from Google Places API
 */
const processLocationData = (places, budget) => {
  const LOCATION_DATA = {
    attractions: [],
    food: []
  };

  console.log(`\n----- Processing ${places?.length || 0} places -----`);
  if (!places) {
    console.log('No places to process');
    return LOCATION_DATA;
  }

  // Food-related keywords to check in place names and types
  const foodKeywords = ['restaurant', 'food', 'cafe', 'coffee', 'eatery', 'dining', 
    'bistro', 'bakery', 'bar', 'pub', 'diner', 'canteen', 'hawker', 'stall', 
    'vegetarian', 'cuisine', 'meal', 'breakfast', 'lunch', 'dinner'];

  places.forEach((place, index) => {
    console.log(`\nProcessing place ${index + 1}: ${place.name}`);
    console.log(`Types: ${JSON.stringify(place.types || [])}`);
    console.log(`Price level: ${place.price_level || 'unspecified'}`);
    
    const placeData = {
      name: place.name,
      address: place.formatted_address || place.address || 'No address available',
      rating: place.rating || 0,
      types: place.types || [],
      price_level: place.price_level
    };

    const types = place.types || [];
    const placeName = place.name?.toLowerCase() || '';
    
    // Check if it's a food place either by type or by name containing food-related keywords
    const isFoodByType = types.some(type => 
      type.includes('restaurant') || 
      type.includes('food') || 
      type.includes('cafe') || 
      type.includes('meal')
    );
    
    const isFoodByName = foodKeywords.some(keyword => placeName.includes(keyword));
    
    if (isFoodByType || isFoodByName) {
      console.log(`Categorizing as FOOD (isFoodByType: ${isFoodByType}, isFoodByName: ${isFoodByName})`);
      
      // Handle price level categorization for food
      if (place.price_level) {
        const priceLevel = Object.entries(PRICE_LEVEL_MAPPING).find(([_, levels]) => 
          levels.includes(`PRICE_LEVEL_${place.price_level}`)
        );
        
        if (priceLevel) {
          placeData.priceCategory = priceLevel[0];
          console.log(`Price category: ${priceLevel[0]}, Budget: ${budget}`);
          
          if (budget === priceLevel[0] || budget === 'ALL') {
            console.log(`✅ Adding to food list - price matches budget`);
            LOCATION_DATA.food.push(placeData);
          } else {
            console.log(`❌ Skipping - price doesn't match budget`);
          }
        } else {
          console.log(`⚠️ No matching price level found for: ${place.price_level}`);
          // Include places without price level mapping
          console.log(`✅ Adding to food list - no price mapping`);
          LOCATION_DATA.food.push(placeData);
        }
      } else {
        // Include places without price level
        console.log(`✅ Adding to food list - no price specified`);
        LOCATION_DATA.food.push(placeData);
      }
    } else {
      // All non-food places go to attractions
      console.log(`✅ Adding to attractions list`);
      LOCATION_DATA.attractions.push(placeData);
    }
  });

  console.log(`\n----- Processing results -----`);
  console.log(`Added ${LOCATION_DATA.attractions.length} attractions`);
  console.log(`Added ${LOCATION_DATA.food.length} food places`);

  return LOCATION_DATA;
};

/**
 * Call location microservice for each preference
 */
const getLocationData = async (preferences, destination) => {
  const LOCATION_DATA = {
    attractions: [],
    food: []
  };

  console.log(`\n====== Getting location data for ${destination} ======`);
  console.log(`Preferences: ${JSON.stringify(preferences, null, 2)}`);

  try {
    // Get places for travel sites
    for (const site of preferences.travelSites) {
      console.log(`\nProcessing travel site: ${site}`);
      const query = `${site} in ${destination}`;
      console.log(`Making API call with query: "${query}"`);
      
      const response = await axios.get(`${PLACES_MICROSERVICE_URL}/api/places`, {
        params: {
          location: destination,
          type: query
        }
      });
      
      console.log(`Got response for ${site}. Results count: ${response.data.results?.length || 0}`);
      if (response.data.results?.length > 0) {
        console.log(`First result: ${JSON.stringify(response.data.results[0], null, 2)}`);
      }
      
      const processedData = processLocationData(response.data.results, preferences.budget);
      console.log(`Processed attractions count: ${processedData.attractions.length}`);
      console.log(`Processed food count: ${processedData.food.length}`);
      
      LOCATION_DATA.attractions = [...LOCATION_DATA.attractions, ...processedData.attractions];
      LOCATION_DATA.food = [...LOCATION_DATA.food, ...processedData.food];
    }

    // Handle food places based on dietary preferences
    for (const diet of preferences.diet) {
      console.log(`\nProcessing diet preference: ${diet}`);
      
      if (diet === 'None') {
        // Make a general food query
        const query = `Food in ${destination}`;
        console.log(`Making API call with query: "${query}"`);
        
        const response = await axios.get(`${PLACES_MICROSERVICE_URL}/api/places`, {
          params: {
            location: destination,
            type: query
          }
        });
        
        console.log(`Got response for general food. Results count: ${response.data.results?.length || 0}`);
        if (response.data.results?.length > 0) {
          console.log(`First result: ${JSON.stringify(response.data.results[0], null, 2)}`);
        }
        
        const processedData = processLocationData(response.data.results, preferences.budget);
        console.log(`Processed food count: ${processedData.food.length}`);
        
        LOCATION_DATA.food = [...LOCATION_DATA.food, ...processedData.food];
      } else if (diet !== 'Allergy') { // Skip allergy preferences
        // Query for each dietary restriction
        const query = `${diet} Food in ${destination}`;
        console.log(`Making API call with query: "${query}"`);
        
        const response = await axios.get(`${PLACES_MICROSERVICE_URL}/api/places`, {
          params: {
            location: destination,
            type: query
          }
        });
        
        console.log(`Got response for ${diet} food. Results count: ${response.data.results?.length || 0}`);
        if (response.data.results?.length > 0) {
          console.log(`First result: ${JSON.stringify(response.data.results[0], null, 2)}`);
        }
        
        const processedData = processLocationData(response.data.results, preferences.budget);
        console.log(`Processed food count: ${processedData.food.length}`);
        
        LOCATION_DATA.food = [...LOCATION_DATA.food, ...processedData.food];
        
        // Try more specific queries to get better food results
        const additionalQueries = [
          `${diet} restaurant in ${destination}`,
          `Best ${diet} food in ${destination}`,
          `${diet} cafe in ${destination}`
        ];
        
        for (const additionalQuery of additionalQueries) {
          console.log(`Making additional API call with query: "${additionalQuery}"`);
          
          try {
            const additionalResponse = await axios.get(`${PLACES_MICROSERVICE_URL}/api/places`, {
              params: {
                location: destination,
                type: additionalQuery
              }
            });
            
            console.log(`Got response for additional query. Results count: ${additionalResponse.data.results?.length || 0}`);
            
            const additionalProcessedData = processLocationData(additionalResponse.data.results, preferences.budget);
            console.log(`Additional processed food count: ${additionalProcessedData.food.length}`);
            
            LOCATION_DATA.food = [...LOCATION_DATA.food, ...additionalProcessedData.food];
          } catch (error) {
            console.error(`Error with additional query "${additionalQuery}":`, error.message);
          }
        }
      }
    }
    
    // If we still don't have enough food places, add some general restaurant queries
    if (LOCATION_DATA.food.length < 5) {
      console.log(`\nNot enough food places found (${LOCATION_DATA.food.length}). Adding general restaurant queries.`);
      
      const generalFoodQueries = [
        `Restaurants in ${destination}`,
        `Popular food in ${destination}`,
        `Cafes in ${destination}`
      ];
      
      for (const query of generalFoodQueries) {
        console.log(`Making backup API call with query: "${query}"`);
        
        try {
          const response = await axios.get(`${PLACES_MICROSERVICE_URL}/api/places`, {
            params: {
              location: destination,
              type: query
            }
          });
          
          console.log(`Got response for backup query. Results count: ${response.data.results?.length || 0}`);
          
          const processedData = processLocationData(response.data.results, preferences.budget);
          console.log(`Backup processed food count: ${processedData.food.length}`);
          
          LOCATION_DATA.food = [...LOCATION_DATA.food, ...processedData.food];
        } catch (error) {
          console.error(`Error with backup query "${query}":`, error.message);
        }
      }
    }

    // Remove duplicate food places by name
    const uniqueFood = [];
    const foodNames = new Set();
    
    LOCATION_DATA.food.forEach(place => {
      if (!foodNames.has(place.name)) {
        foodNames.add(place.name);
        uniqueFood.push(place);
      }
    });
    
    LOCATION_DATA.food = uniqueFood;

    console.log(`\n====== Final location data summary ======`);
    console.log(`Total attractions: ${LOCATION_DATA.attractions.length}`);
    console.log(`Total food places: ${LOCATION_DATA.food.length}`);
    console.log(`================================================\n`);

    return LOCATION_DATA;
  } catch (error) {
    console.error('Error fetching location data:', error);
    return null;
  }
};

/**
 * Generate Gemini API prompt
 */
const generateGeminiPrompt = (preferences, locationData, tripDetails) => {
  return `
    Create a detailed travel itinerary in JSON format for a trip to ${tripDetails.destination} with the following specifications:

    Travel Details:
    - Number of travelers: ${tripDetails.numTravelers}
    - Budget: ${preferences.budget}
    - Start Date: ${tripDetails.startDate}
    - End Date: ${tripDetails.endDate}
    - Daily Start Time: ${preferences.startTime}
    - Daily End Time: ${preferences.endTime}

    User Preferences:
    - Travel Style: ${preferences.travelStyle.join(', ')}
    - Travel Sites: ${preferences.travelSites.join(', ')}
    - Dietary Restrictions: ${preferences.diet.join(', ')}

    Available Places:
    ${JSON.stringify(locationData, null, 2)}

    CRITICAL REQUIREMENTS:
    1. The response MUST be in valid JSON format. This is the MOST important requirement.
    2. The response MUST include a 'travelDetails' object with ALL the following fields:
       - destination: MUST be exactly "${tripDetails.destination}" (preserve this exact destination string)
       - number_of_travelers: ${tripDetails.numTravelers}
       - budget: ${preferences.budget}
       - start_date: "${tripDetails.startDate}"
       - end_date: "${tripDetails.endDate}"
       - daily_start_time: "${preferences.startTime}"
       - daily_end_time: "${preferences.endTime}"

    Important Requirements:
    - Please create a FULL-DAY itinerary for each day, including the last day. The last day should NOT be treated as a departure day.
    - ALWAYS include AT LEAST two meals (lunch and dinner) in EACH day's itinerary.
    - Balance the activities according to the user's preferences.
    - Make sure all days have roughly the same number of activities.
    - Respect the daily start and end times.
    - PRIORITIZE using the places provided in the Available Places section first.
    - Avoid repeating attractions and food places as much as possible throughout the itinerary.
    - If the available places provided are not enough, you may suggest additional places.
    - Adhere strictly to dietary restrictions but treat travel sites and travel style as lower priority if needed.
    - ALWAYS suggest specific food places or restaurants. NEVER tell the user to "find a place" or "choose a restaurant" on their own.
    - Format location names as proper names only. Do NOT include qualifiers like "(Suggested)" or descriptors like "- Optional: Evening Walk" in the location_name field. Put these details in the description field instead.
    - Treat the user's travel style and travel sites preferences ONLY as guidelines. Include popular and must-see attractions that an average tourist would want to visit in ${tripDetails.destination}, even if they don't match the user's stated preferences.
    - For all food-related activities, ALWAYS use specific restaurant names (e.g., "Lotus Vegetarian Restaurant" or "Green Earth Cafe") instead of generic descriptions like "Local Food Stall" or "Vegetarian Food stall (alternatives)".
    - NEVER use terms like "alternatives", "options", or "various" in the location name. Instead, commit to a specific restaurant name.

    Please create a day-by-day itinerary in JSON format where each day is a key and the value is an array of activities.
    Each activity should include:
    - Time (in 24-hour format, e.g., "09:00")
    - Location name (specific name, no qualifiers)
    - Description (detailed description of the activity)
    - Travel time between locations (in hours and minutes format, e.g., "1h 30mins" or "45mins")
    - Estimated duration (in hours and minutes format, e.g., "2h" or "1h 15mins")
    - Any relevant notes (e.g., dietary options, accessibility)

    IMPORTANT TIME REQUIREMENTS:
    - Travel time MUST be specified in hours and minutes format (e.g., "1h 30mins" or "45mins") rather than just minutes
    - Duration MUST be specified in hours and minutes format (e.g., "2h" or "1h 15mins") rather than just minutes
    - If duration or travel time is 0, use "0mins" (not "0h")
    - NEVER use "0mins" for travel time unless activities are in the exact same location
    - NEVER use "0mins" for duration
    - Ensure activities don't overlap in time, accounting for both duration and travel time
    - Do not use estimations of timings (e.g. "1-2h"). Always use specific times.

    Format the response as a valid JSON object with days as keys and activities as values.
    
    AGAIN, THE MOST CRITICAL REQUIREMENT: The entire response MUST be valid, parseable JSON. Do not include ANY explanatory text outside the JSON structure.
  `;
};

/**
 * Clean the Gemini response to get valid JSON
 */
const cleanGeminiResponse = (response) => {
  // Remove markdown code block indicators
  let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // If the response starts with a newline, remove it
  if (cleaned.startsWith('\n')) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned;
};

/**
 * Generate itinerary using Gemini
 */
app.post('/api/itinerary', async (req, res) => {
  try {
    const { destination, numTravelers, budget, startDate, endDate } = req.body;
    console.log(`\n====== Generating itinerary for ${destination} ======`);

    // Get user preferences (using dummy data for now)
    const preferences = await getUserPreferences(req);
    preferences.budget = budget.toUpperCase();

    // Get location data
    const locationData = await getLocationData(preferences, destination);

    if (!locationData) {
      console.error('Failed to fetch location data');
      return res.status(500).json({ error: 'Failed to fetch location data' });
    }

    // Generate prompt for Gemini
    const prompt = generateGeminiPrompt(preferences, locationData, {
      destination,
      numTravelers,
      startDate,
      endDate
    });

    // Get response from Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean and parse the response
    const cleanedResponse = cleanGeminiResponse(text);
    console.log('\n====== Gemini Response ======');

    try {
      const jsonResponse = JSON.parse(cleanedResponse);
      
      // Check for food recommendations
      let foodRecommendations = [];
      if (jsonResponse.itinerary) {
        Object.values(jsonResponse.itinerary).forEach(day => {
          day.forEach(activity => {
            if (activity.location_name?.toLowerCase().includes('food') || 
                activity.location_name?.toLowerCase().includes('restaurant') ||
                activity.location_name?.toLowerCase().includes('lunch') ||
                activity.location_name?.toLowerCase().includes('dinner') ||
                activity.location_name?.toLowerCase().includes('vegetarian')) {
              foodRecommendations.push(activity.location_name);
            }
          });
        });
      }
      
      console.log('\n====== Food Recommendations ======');
      console.log(`Found ${foodRecommendations.length} food recommendations:`);
      foodRecommendations.forEach((rec, index) => console.log(`${index + 1}. ${rec}`));
      
      // Add travel details to the response for frontend compatibility
      if (!jsonResponse.travelDetails && !jsonResponse.travel_details) {
        jsonResponse.travelDetails = {
          number_of_travelers: numTravelers,
          budget: budget.toUpperCase(),
          start_date: startDate,
          end_date: endDate,
          daily_start_time: preferences.startTime,
          daily_end_time: preferences.endTime,
          destination: destination
        };
      }
      
      res.json(jsonResponse);
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      res.status(500).json({ 
        error: 'Failed to parse itinerary response',
        details: parseError.message,
        rawResponse: text
      });
    }
  } catch (error) {
    console.error('Error generating itinerary:', error);
    res.status(500).json({ 
      error: 'Failed to generate itinerary',
      details: error.message
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// Export functions for testing
module.exports = {
  getLocationData
};
