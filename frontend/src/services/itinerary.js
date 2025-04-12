import axios from 'axios';

const API_URL = 'http://localhost:8000/api/itineraries';

class ItineraryService {
  // Save a new itinerary
  async saveItinerary(itineraryData, travelDetails) {
    try {
      const response = await axios.post(API_URL, {
        itinerary: itineraryData,
        travelDetails: travelDetails
      });
      return response.data;
    } catch (error) {
      console.error('Error saving itinerary:', error);
      throw error;
    }
  }

  // Get all saved itineraries for the current user
  async getSavedItineraries() {
    try {
      const response = await axios.get(API_URL);
      return response.data.itineraries;
    } catch (error) {
      console.error('Error fetching saved itineraries:', error);
      throw error;
    }
  }

  // Get a specific itinerary by ID
  async getItineraryById(itineraryID) {
    try {
      const response = await axios.get(`${API_URL}/${itineraryID}`);
      return response.data.itinerary;
    } catch (error) {
      console.error(`Error fetching itinerary with ID ${itineraryID}:`, error);
      throw error;
    }
  }

  // Delete an itinerary
  async deleteItinerary(itineraryID) {
    try {
      const response = await axios.delete(`${API_URL}/${itineraryID}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting itinerary with ID ${itineraryID}:`, error);
      throw error;
    }
  }
}

export default new ItineraryService(); 