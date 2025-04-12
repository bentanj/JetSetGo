1) Run the following two commands to start server:
docker build -t location-service .
docker run -p 4500:4500 location-service

2) Request query should look like:
{
  "textQuery": "Spicy Vegetarian food in America, Minnesota"
}

3) Response query will look like:
{
  "places": [
    {
      "formattedAddress": "string",
      "regularOpeningHours": {
        "openNow": true,
        "periods": [
          {
            "open": {
              "day": 0,
              "hour": 0,
              "minute": 0
            },
            "close": {
              "day": 0,
              "hour": 0,
              "minute": 0
            }
          }
        ],
        "weekdayDescriptions": [
          "string"
        ],
        "nextOpenTime": "ISO 8601 datetime string",
        "nextCloseTime": "ISO 8601 datetime string"
      },
      "priceLevel": "string",
      "displayName": {
        "text": "string",
        "languageCode": "string"
      }
    }
  ]
}

4) ADDITIONAL DOCUMENTATION

priceLevel (may not always be returned)
- PRICE_LEVEL_FREE
- PRICE_LEVEL_INEXPENSIVE
- PRICE_LEVEL_MODERATE
- PRICE_LEVEL_EXPENSIVE
- PRICE_LEVEL_VERY_EXPENSIVE

weekdayDescriptions
[
    "Monday: 9:00 AM – 5:00 PM",
    "Tuesday: 9:00 AM – 5:00 PM",
    "Wednesday: 9:00 AM – 5:00 PM",
    "Thursday: 9:00 AM – 5:00 PM",
    "Friday: 9:00 AM – 5:00 PM",
    "Saturday: Closed",
    "Sunday: Closed",
]

5) Runs on port 4500