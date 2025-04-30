import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import AddProperty from "./AddProperty";
import Property from "./Property";
import Loader from "../utils/Loader";
import PropTypes from "prop-types";
import { Row } from "react-bootstrap";
import {
  createPropertyAction,
  getPropertiesAction,
  deletePropertyAction,
  buyPropertyAction,
  ratePropertyAction,
  getApplication,
} from "../../utils/propertycontract";

const Properties = ({ address, fetchBalance }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);

  const getProperties = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Fetching properties...");
      
      try {
        const properties = await getPropertiesAction();
        console.log("Properties fetched:", properties);
        
        if (properties && properties.length > 0) {
          setProperties(properties);
          console.log(`Successfully loaded ${properties.length} properties`);
        } else {
          console.log("No properties found from indexer, keeping existing properties");
          toast.info("No properties found. Create one to get started!");
        }
      } catch (error) {
        console.error("Error fetching properties from indexer:", error);
        toast.error(`Error loading properties: ${error.message || error}`);
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error in getProperties:", error);
      setLoading(false);
    }
  }, []);

  const createProperty = async (data) => {
    try {
      setLoading(true);
      console.log("Creating property with address:", address);
      console.log("Property data:", data);
      
      // Validate the data
      if (!data.title || !data.image || !data.location || !data.price) {
        throw new Error("All fields are required");
      }
      
      // Create the property
      const appId = await createPropertyAction(address, data);
      console.log("Property created with appId:", appId);
      
      // Save the appId to localStorage
      try {
        const savedAppIds = JSON.parse(localStorage.getItem('propertyAppIds') || '[]');
        if (!savedAppIds.includes(appId)) {
          savedAppIds.push(appId);
          localStorage.setItem('propertyAppIds', JSON.stringify(savedAppIds));
          console.log(`Saved appId ${appId} to localStorage`);
        }
      } catch (error) {
        console.error("Error saving appId to localStorage:", error);
      }
      
      // Show success notification
      toast.success("Property created successfully!");
      
      // Update balance
      await fetchBalance(address);
      
      // Add the new property directly to the state
      try {
        const newProperty = await getApplication(appId);
        if (newProperty) {
          setProperties(prevProperties => [...prevProperties, newProperty]);
          console.log("Added new property to UI:", newProperty.title);
        }
      } catch (error) {
        console.error("Error adding new property to UI:", error);
      }
      
      // Also try to refresh all properties
      setTimeout(async () => {
        try {
          await getProperties();
        } catch (error) {
          console.error("Error refreshing properties:", error);
        } finally {
          setLoading(false);
        }
      }, 2000);
      
      return appId;
    } catch (error) {
      console.error("Error creating property:", error);
      const errorMessage = error.message || "Failed to create a property.";
      console.log("Error details:", error);
      toast.error(errorMessage);
      setLoading(false);
      throw error; // Re-throw to handle in the AddProperty component
    }
  };

  const buyProperty = async (property) => {
    try {
      setLoading(true);
      await buyPropertyAction(address, property);
      await getProperties();
      await fetchBalance(address);
      toast.success("Property bought successfully");
    } catch (error) {
      console.error("Error buying property:", error);
      toast.error(`Error buying property: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteProperty = async (property) => {
    try {
      setLoading(true);
      await deletePropertyAction(address, property.appId);
      await getProperties();
      toast.success("Property deleted successfully");
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error(`Error deleting property: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const rateProperty = async (property, rate) => {
    try {
      setLoading(true);
      await ratePropertyAction(address, property, rate);
      await getProperties();
      toast.success("Property rated successfully");
    } catch (error) {
      console.error("Error rating property:", error);
      toast.error(`Error rating property: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProperties();
  }, [getProperties]);

  if (loading) {
    return <Loader />;
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fs-4 fw-bold mb-0">Properties</h1>
        <AddProperty createProperty={createProperty} />
      </div>
      <Row xs={1} sm={2} lg={3} className="g-3 mb-5 g-xl-4 g-xxl-5">
        {properties.map((_property) => (
          <Property
            address={address}
            property={_property}
            buyProperty={buyProperty}
            deleteProperty={deleteProperty}
            rateProperty={rateProperty}
            key={_property.appId}
          />
        ))}
      </Row>
    </>
  );
};

Properties.propTypes = {
  address: PropTypes.string.isRequired,
  fetchBalance: PropTypes.func.isRequired,
};

export default Properties;
