import React, { useState } from "react";
import PropTypes from "prop-types";
import { Button, Modal, Form, FloatingLabel } from "react-bootstrap";
import { toast } from "react-toastify";

const AddProperty = ({ createProperty }) => {
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState(0);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Function to handle property creation
  const handleCreateProperty = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      
      // Validate inputs
      if (!title || !image || !location || !price) {
        setErrorMessage("All fields are required");
        setLoading(false);
        return;
      }
      
      if (price <= 0) {
        setErrorMessage("Price must be greater than 0");
        setLoading(false);
        return;
      }
      
      // Log the data being sent
      console.log("Creating property with data:", {
        title,
        image,
        location,
        price: Number(price) * 1000000 // Convert to microAlgos
      });
      
      // Create property
      const property = {
        title,
        image,
        location,
        price: Number(price) * 1000000, // Convert to microAlgos
      };
      
      // Close modal before async operation to prevent state updates after unmounting
      handleClose();
      
      await createProperty(property);
    } catch (error) {
      console.error("Error creating property:", error);
      // Only set state if component is still mounted
      if (show) {
        setErrorMessage(`Error: ${error.message || "Failed to create property"}`);
        toast.error(`Error: ${error.message || "Failed to create property"}`);
        setLoading(false);
      }
    }
  };

  // Handle modal close
  const handleClose = () => {
    setShow(false);
    setTitle("");
    setImage("");
    setLocation("");
    setPrice(0);
    setErrorMessage("");
  };

  return (
    <>
      <Button
        onClick={() => setShow(true)}
        variant="dark"
        className="rounded-pill px-0"
        style={{ width: "38px" }}
      >
        <i className="bi bi-plus"></i>
      </Button>
      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>New Property</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <FloatingLabel
              controlId="inputTitle"
              label="Property title"
              className="mb-3"
            >
              <Form.Control
                type="text"
                placeholder="Property title"
                onChange={(e) => {
                  setTitle(e.target.value);
                }}
              />
            </FloatingLabel>
            <FloatingLabel
              controlId="inputImage"
              label="Image URL"
              className="mb-3"
            >
              <Form.Control
                type="text"
                placeholder="Image URL"
                onChange={(e) => {
                  setImage(e.target.value);
                }}
              />
            </FloatingLabel>
            <FloatingLabel
              controlId="inputLocation"
              label="Location"
              className="mb-3"
            >
              <Form.Control
                type="text"
                placeholder="Location"
                onChange={(e) => {
                  setLocation(e.target.value);
                }}
              />
            </FloatingLabel>
            <FloatingLabel
              controlId="inputPrice"
              label="Price in ALGO"
              className="mb-3"
            >
              <Form.Control
                type="number"
                placeholder="Price in ALGO"
                onChange={(e) => {
                  setPrice(e.target.value);
                }}
              />
            </FloatingLabel>
            {errorMessage && (
              <div className="alert alert-danger mt-2">{errorMessage}</div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleClose}>
            Close
          </Button>
          <Button
            variant="dark"
            disabled={!title || !image || !location || !price || loading}
            onClick={handleCreateProperty}
          >
            {loading ? "Creating..." : "Create Property"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

AddProperty.propTypes = {
  createProperty: PropTypes.func.isRequired,
};

export default AddProperty;
