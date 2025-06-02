// client/src/components/RealTimeBtcPrice.jsx
import React, { useState, useEffect } from 'react';

const getWebSocketURL = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  const host =
    window.location.hostname === 'localhost'
      ? 'localhost:3001'
      : window.location.host;
  // If your API is on a different subdomain or path for WebSockets when deployed, adjust accordingly.
  // For Vercel, if client is client.com and server is api.client.com, this needs to be api.client.com
  // If client and server are served from same domain (e.g. server also serves client static files, or proxy)
  // then window.location.host is correct.
  // For now, assuming server is on localhost:3001 for dev, or same host in prod.
  return import.meta.env.VITE_WS_BASE_URL || `${protocol}${host}`;
};

export const RealTimeBtcPrice = () => {
  const [btcPrice, setBtcPrice] = useState('---.--');
  const [wsStatus, setWsStatus] = useState('Connecting...');

  useEffect(() => {
    const WEBSOCKET_URL = getWebSocketURL();
    console.log(`Attempting to connect to WebSocket at: ${WEBSOCKET_URL}`);
    const ws = new WebSocket(WEBSOCKET_URL);

    ws.onopen = () => {
      console.log('Connected to backend WebSocket for price updates.');
      setWsStatus('Connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'btc_price_update' && message.price) {
          setBtcPrice(message.price);
        }
      } catch (error) {
        console.error('Error parsing price update message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('Disconnected from backend WebSocket.', event.reason);
      setWsStatus('Disconnected. Attempting to reconnect...');
      // Basic reconnect attempt (could be more sophisticated)
      setTimeout(() => {
        // This effect will re-run if component is still mounted & deps change,
        // but for explicit reconnect on close, you'd need more state mgmt or a new ws instance.
        // For simplicity, this example doesn't implement aggressive auto-reconnect on explicit close here.
        // A robust solution might involve a retry counter and exponential backoff.
        // For now, it will try to reconnect if the component re-renders or on manual refresh.
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('Backend WebSocket error:', error);
      setWsStatus('Error. Check console.');
    };

    return () => {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        console.log('Closing client WebSocket connection.');
        ws.close();
      }
    };
  }, []);

  return (
    <div className='btc-price-container'>
      <h4>Live Bitcoin (BTC-USD) Price:</h4>
      <p style={{ fontSize: '1.5em', color: '#61dafb', fontWeight: 'bold' }}>
        ${btcPrice}
      </p>
      <p style={{ fontSize: '0.8em', fontStyle: 'italic' }}>
        Status: {wsStatus}
      </p>
    </div>
  );
};
