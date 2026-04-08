
/**
 * Haversine formula to calculate distance between two points in kilometers
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

/**
 * Estimate steps based on distance in km
 * Average step length is ~0.75 meters
 * 1 km = 1000 / 0.75 = ~1333 steps
 */
export const calculateSteps = (distance: number): number => {
  return Math.round(distance * 1333);
};

/**
 * Calculate Basal Metabolic Rate (BMR)
 */
export const calculateBMR = (weight: number, height: number, age: number, gender: 'male' | 'female'): number => {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
};

/**
 * Estimate calories burned based on distance and weight
 * Average walking burn: ~0.75 kcal per kg per km
 */
export const calculateCaloriesBurned = (distance: number, weight: number): number => {
  return Math.round(distance * weight * 0.75);
};

/**
 * Estimate water intake based on activity and time
 * Basal hydration: ~0.1L per hour
 * Activity hydration: ~0.001L per calorie burned
 */
export const calculateWaterIntake = (caloriesBurned: number, hoursElapsed: number): number => {
  const basalWater = hoursElapsed * 0.1;
  const activityWater = caloriesBurned * 0.001;
  return Math.round((basalWater + activityWater) * 100) / 100;
};

/**
 * Track movement using Geolocation API
 */
export const startMovementTracking = (
  onDistanceUpdate: (distanceDelta: number) => void,
  onError: (error: GeolocationPositionError) => void
) => {
  if (!navigator.geolocation) {
    console.error('Geolocation is not supported by this browser.');
    return null;
  }

  let lastPos: GeolocationPosition | null = null;

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      if (lastPos) {
        const dist = calculateDistance(
          lastPos.coords.latitude,
          lastPos.coords.longitude,
          position.coords.latitude,
          position.coords.longitude
        );

        // Filter out noise (less than 5 meters or unrealistic jumps)
        if (dist > 0.005 && dist < 0.5) {
          onDistanceUpdate(dist);
        }
      }
      lastPos = position;
    },
    onError,
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    }
  );

  return watchId;
};

/**
 * Estimate sleep duration based on last activity and current time
 */
export const estimateSleepDuration = (lastActiveTimestamp: number): number => {
  const now = Date.now();
  const diffMs = now - lastActiveTimestamp;
  const diffHours = diffMs / (1000 * 60 * 60);

  // If the gap is between 4 and 14 hours, it's likely sleep
  if (diffHours >= 4 && diffHours <= 14) {
    return Math.round(diffHours * 10) / 10;
  }
  
  return 0;
};
