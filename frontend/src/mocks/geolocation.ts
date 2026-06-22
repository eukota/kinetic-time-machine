let mockLatitude = 40.7128;
let mockLongitude = -74.0060;

export const setMockLocation = (lat: number, lon: number) => {
  mockLatitude = lat;
  mockLongitude = lon;
};

export const getMockPosition = (): GeolocationPosition => {
  return {
    coords: {
      latitude: mockLatitude,
      longitude: mockLongitude,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  };
};
