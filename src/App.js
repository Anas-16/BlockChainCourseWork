import React, { useState, useEffect, useCallback } from "react";
import Cover from "./components/Cover";
import "./App.css";
import Wallet from "./components/Wallet";
import { Container, Nav } from "react-bootstrap";
import Properties from "./components/property/Properties";
import { indexerClient, peraWallet } from "./utils/constants";
import { Notification } from "./components/utils/Notifications";

const App = function AppWrapper() {
  const [address, setAddress] = useState(null);
  const [name, setName] = useState(null);
  const [balance, setBalance] = useState(0);

  const fetchBalance = useCallback(async (accountAddress) => {
    indexerClient
      .lookupAccountByID(accountAddress)
      .do()
      .then((response) => {
        const _balance = response.account.amount;
        setBalance(_balance);
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  const connectWallet = async () => {
    try {
      const accounts = await peraWallet.connect();
      if (accounts.length === 0) {
        return;
      }
      
      const _account = accounts[0];
      setAddress(_account);
      setName("Pera Wallet");
      fetchBalance(_account);
    } catch (error) {
      console.log("Could not connect to Pera wallet");
      console.error(error);
    }
  };

  const disconnect = () => {
    peraWallet.disconnect();
    setAddress(null);
    setName(null);
    setBalance(null);
  };

  const reconnectWallet = useCallback(async () => {
    try {
      console.log("Attempting to reconnect wallet...");
      // First disconnect
      peraWallet.disconnect();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then reconnect
      const accounts = await peraWallet.connect();
      if (accounts.length > 0) {
        const _account = accounts[0];
        setAddress(_account);
        setName("Pera Wallet");
        fetchBalance(_account);
        console.log("Wallet reconnected successfully");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error reconnecting wallet:", error);
      return false;
    }
  }, [fetchBalance]);

  useEffect(() => {
    // Initialize localStorage if needed
    if (!localStorage.getItem('propertyAppIds')) {
      localStorage.setItem('propertyAppIds', JSON.stringify([]));
      console.log("Initialized property app IDs in localStorage");
    }
    
    // Optionally auto-connect wallet on page load
    // connectWallet();
  }, [/* connectWallet */]); // Commented out to avoid auto-connecting

  return (
    <>
      <Notification />
      {address ? (
        <Container fluid="md">
          <Nav className="justify-content-end pt-3 pb-5">
            <Nav.Item>
              <Wallet
                address={address}
                name={name}
                amount={balance}
                disconnect={disconnect}
                symbol={"ALGO"}
              />
            </Nav.Item>
          </Nav>
          <main>
            <Properties 
              address={address} 
              fetchBalance={fetchBalance} 
              reconnectWallet={reconnectWallet} 
            />
          </main>
        </Container>
      ) : (
        <Cover
          name={"Housing Property Dapp"}
          coverImg={
            "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1024&q=80"
          }
          connect={connectWallet}
        />
      )}
    </>
  );
};

export default App;
