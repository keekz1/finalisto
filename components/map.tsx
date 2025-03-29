import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { GoogleMap, Marker, useJsApiLoader, Circle } from '@react-google-maps/api';
import io from 'socket.io-client';
import styles from './map.module.css';

interface User {
  id: string;
  lat: number;
  lng: number;
}

const MapComponent: React.FC = () => {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const locationCache = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyDDmC7UTacmsXQ5c_9z4W1VozgoFwUn9AA',
    libraries: ['places'],
  });

  const mapStyle = [
    {
      elementType: 'geometry',
      stylers: [{ color: '#2E2E3A' }],
    },
    {
      elementType: 'labels.icon',
      stylers: [{ visibility: 'off' }],
    },
    {
      elementType: 'labels.text.fill',
      stylers: [{ color: '#E5E5E5' }],
    },
    {
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#2E2E3A' }],
    },
    {
      featureType: 'administrative',
      elementType: 'geometry',
      stylers: [{ color: '#3C3C47' }],
    },
    {
      featureType: 'poi',
      elementType: 'geometry',
      stylers: [{ color: '#1A1A2E' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#3C3C47' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#0E4D92' }],
    },
  ];
  
  
  
  
  const generatePersistentOffset = useCallback((userId: string, realLat: number, realLng: number) => {
    if (!locationCache.current.has(userId)) {
      const seed = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const randomOffset = (seed % 10) * 0.0001;
      locationCache.current.set(userId, {
        lat: realLat + randomOffset,
        lng: realLng + randomOffset,
      });
    }
    return locationCache.current.get(userId)!;
  }, []);

  const handleVisibilityToggle = useCallback(() => {
    setIsVisible((prev) => {
      const newVisibility = !prev;
      localStorage.setItem('isVisible', JSON.stringify(newVisibility));
      socketRef.current?.emit('visibility-change', newVisibility);
      return newVisibility;
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    setIsVisible(JSON.parse(localStorage.getItem('isVisible') ?? 'true'));

    const socket = io('https://backendfst1.onrender.com', {
      transports: ['websocket'],
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
      setIsConnecting(false);
      setMapError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          requestAnimationFrame(() => {
            const realLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
            const persistentLocation = generatePersistentOffset(socket.id!, realLocation.lat, realLocation.lng);
            setCurrentLocation(persistentLocation);
            socket.emit('user-location', realLocation);
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setMapError('Enable location permissions to use this feature');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    socket.on('connect_error', () => {
      setMapError('Connection issues - retrying...');
      setIsConnecting(true);
    });

    socket.on('disconnect', () => {
      setMapError('Reconnecting...');
      setIsConnecting(true);
    });

    socket.on('nearby-users', (data: User[]) => {
      requestAnimationFrame(() => {
        const processedUsers = data.map(user => ({
          ...user,
          ...generatePersistentOffset(user.id, user.lat, user.lng),
        }));
        setNearbyUsers(processedUsers);
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      locationCache.current.clear();
      setCurrentLocation(null);
      setNearbyUsers([]);
    };
  }, [isLoaded, generatePersistentOffset]);
  const handleMapLoad = (map: google.maps.Map): void => {
    // Perform necessary actions with the map instance
    console.log("Map loaded", map);
  };
  
  <GoogleMap
    onLoad={handleMapLoad}
  />;
  
  if (!isLoaded) return <div className={styles.loading}>Loading map...</div>;
  if (isConnecting) return <div className={styles.loading}>Connecting to server...</div>;
  if (mapError) return <div className={styles.error}>{mapError}</div>;
  if (!currentLocation) return <div className={styles.loading}>Getting your location...</div>;

  return (
    <div className={styles.container}>
      <GoogleMap
        mapContainerClassName={styles.map}
        center={currentLocation}
        zoom={13}
        options={{
          disableDefaultUI: true,
          styles: mapStyle,
        }}
        onLoad={handleMapLoad}
        >
        {isVisible && (
          <>
            <Circle
              center={currentLocation}
              radius={16093.4}
              options={{
                fillColor: '#6600CC',
                fillOpacity: 0.1,
                strokeColor: '#FFFFFF',
                strokeOpacity: 0.5,
                strokeWeight: 2,
              }}
            />
            <Marker
              position={currentLocation}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
              }}
            />
            {nearbyUsers.map((user) => (
              <Marker
                key={user.id}
                position={{ lat: user.lat, lng: user.lng }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 6,
                  fillColor: '#FF0000',
                  fillOpacity: 1,
                  strokeColor: 'white',
                  strokeWeight: 2,
                }}
              />
            ))}
          </>
        )}
      </GoogleMap>
      <button onClick={handleVisibilityToggle} className={styles.toggleButton}>
        {isVisible ? 'Hide Locations' : 'Show Locations'}
      </button>
    </div>
  );
};

export default MapComponent;