import { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';

const RestaurantContext = createContext({
  name: 'My Restaurant',
  currency: 'Rs.',
  taxPercent: 8,
  logo: '',
  address: '',
  phone: '',
  loading: true,
  refresh: () => {},
});

export function RestaurantProvider({ children }) {
  const [config, setConfig] = useState({
    name: process.env.REACT_APP_RESTAURANT_NAME || 'My Restaurant',
    currency: process.env.REACT_APP_CURRENCY || 'Rs.',
    taxPercent: parseFloat(process.env.REACT_APP_TAX_PERCENT) || 8,
    logo: '',
    address: '',
    phone: '',
    loading: true,
  });

  const load = () => {
    api.get('/restaurant-config')
      .then(({ data }) => {
        if (data?.data) {
          setConfig({ ...data.data, loading: false });
        }
      })
      .catch(() => {
        setConfig(c => ({ ...c, loading: false }));
      });
  };

  useEffect(() => { load(); }, []);

  return (
    <RestaurantContext.Provider value={{ ...config, refresh: load }}>
      {children}
    </RestaurantContext.Provider>
  );
}

export const useRestaurant = () => useContext(RestaurantContext);
