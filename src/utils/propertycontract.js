import algosdk from "algosdk";
import {
  algodClient,
  indexerClient,
  minRound,
  peraWallet,
  numGlobalBytes,
  numGlobalInts,
  numLocalBytes,
  numLocalInts,
  propertyDappNote,
} from "./constants";
/* eslint import/no-webpack-loader-syntax: off */
import approvalProgram from "!!raw-loader!../contracts/property_contract_approval.teal";
import clearProgram from "!!raw-loader!../contracts/property_contract_clear.teal";
import { base64ToUTF8String, utf8ToBase64String } from "./conversions";

class Property {
  constructor(
    title,
    image,
    location,
    price,
    bought,
    rate,
    buyer,
    appId,
    owner
  ) {
    this.title = title;
    this.image = image;
    this.location = location;
    this.price = price;
    this.bought = bought;
    this.rate = rate;
    this.buyer = buyer;
    this.appId = appId;
    this.owner = owner;
  }
}

// Compile smart contract in .teal format to program
const compileProgram = async (programSource) => {
  let encoder = new TextEncoder();
  let programBytes = encoder.encode(programSource);
  let compileResponse = await algodClient.compile(programBytes).do();
  return new Uint8Array(Buffer.from(compileResponse.result, "base64"));
};

// CREATE PRODUCT: ApplicationCreateTxn
export const createPropertyAction = async (senderAddress, property) => {
  console.log("Adding property...");
  console.log("Sender address:", senderAddress);
  console.log("Property data:", property);

  try {
    let params = await algodClient.getTransactionParams().do();
    console.log("Transaction params:", params);

    // Compile programs
    console.log("Compiling approval program...");
    const compiledApprovalProgram = await compileProgram(approvalProgram);
    console.log("Compiling clear program...");
    const compiledClearProgram = await compileProgram(clearProgram);
    console.log("Programs compiled successfully");

    // Build note to identify transaction later and required app args as Uint8Arrays
    let note = new TextEncoder().encode(propertyDappNote);
    let title = new TextEncoder().encode(property.title);
    let image = new TextEncoder().encode(property.image);
    let location = new TextEncoder().encode(property.location);
    
    // Fix for uint64 encoding issue - without using BigInt
    let priceUint8Array;
    try {
      // Try the standard method first
      priceUint8Array = algosdk.encodeUint64(property.price);
    } catch (error) {
      console.log("Standard uint64 encoding failed, using alternative method");
      // Alternative method without BigInt
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      
      // Ensure price is a number and within safe range
      const priceNumber = Number(property.price);
      if (isNaN(priceNumber) || priceNumber < 0) {
        throw new Error("Price must be a positive number");
      }
      
      // Manual encoding of 64-bit integer (big-endian)
      // This handles the high 32 bits and low 32 bits separately
      const high = Math.floor(priceNumber / 4294967296); // 2^32
      const low = priceNumber % 4294967296;
      
      view.setUint32(0, high, false); // high 32 bits
      view.setUint32(4, low, false);  // low 32 bits
      priceUint8Array = new Uint8Array(buffer);
    }
    
    // Use a shorter representation of the owner address to save space
    let owner = new TextEncoder().encode(senderAddress);

    let appArgs = [title, image, location, owner, priceUint8Array];
    console.log("App args prepared:", {
      title: property.title,
      image: property.image,
      location: property.location,
      price: property.price,
      owner: senderAddress
    });

    // Create ApplicationCreateTxn
    console.log("Creating application transaction...");
    let txn = algosdk.makeApplicationCreateTxnFromObject({
      from: senderAddress,
      suggestedParams: params,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      approvalProgram: compiledApprovalProgram,
      clearProgram: compiledClearProgram,
      numLocalInts: numLocalInts,
      numLocalByteSlices: numLocalBytes,
      numGlobalInts: numGlobalInts,
      numGlobalByteSlices: numGlobalBytes,
      note: note,
      appArgs: appArgs,
    });

    // Get transaction ID
    let txId = txn.txID().toString();
    console.log("Transaction created with ID:", txId);

    // Sign & submit the transaction
    console.log("Signing transaction with Pera wallet...");
    const singleTxnGroups = [{ txn }];
    try {
      const signedTxn = await peraWallet.signTransaction([singleTxnGroups]);
      console.log("Transaction signed successfully");
      
      console.log("Sending transaction to network...");
      await algodClient.sendRawTransaction(signedTxn).do();
      console.log("Transaction sent successfully");
      
      // Wait for transaction to be confirmed
      console.log("Waiting for transaction confirmation...");
      let confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
      console.log("Transaction confirmed in round:", confirmedTxn["confirmed-round"]);
      
      // Get created application id and notify about completion
      console.log("Getting transaction information...");
      let transactionResponse = await algodClient
        .pendingTransactionInformation(txId)
        .do();
      let appId = transactionResponse["application-index"];
      console.log("Created new app-id:", appId);
      return appId;
    } catch (error) {
      console.error("Error in transaction signing or submission:", error);
      throw new Error(`Transaction failed: ${error.message || "Unknown error during transaction"}`);
    }
  } catch (error) {
    console.error("Error in createPropertyAction:", error);
    throw new Error(`Failed to create property: ${error.message || "Unknown error"}`);
  }
};

// BUY PROPERTY: ApplicationCallTxn
export const buyPropertyAction = async (senderAddress, property) => {
  console.log("Buying property...");
  console.log("Sender address:", senderAddress);
  console.log("Property:", property);
  
  try {
    // Get transaction params
    const params = await algodClient.getTransactionParams().do();
    console.log("Transaction params:", params);
    
    // Create application call transaction to buy property
    const appId = property.appId;
    console.log(`Creating application call for appId: ${appId}`);
    
    // Convert price to microAlgos
    const price = property.price;
    console.log(`Property price: ${price} microAlgos`);
    
    // Create application args
    const buyArg = new TextEncoder().encode("buy");
    const buyerArg = new TextEncoder().encode(senderAddress);
    
    // Create application call transaction
    const appCallTxn = algosdk.makeApplicationNoOpTxn(
      senderAddress,
      params,
      appId,
      [buyArg, buyerArg], // Include the buyer address as an argument
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );
    
    // Create payment transaction
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParams(
      senderAddress,
      property.owner,
      price,
      undefined,
      undefined,
      params
    );
    
    // Group transactions
    const txnGroup = [appCallTxn, paymentTxn];
    algosdk.assignGroupID(txnGroup);
    
    console.log("Transaction group created");
    
    // Sign transactions with Pera wallet
    console.log("Signing transactions with Pera wallet...");
    
    const txnsToSign = txnGroup.map(txn => {
      return {
        txn: txn,
        signers: [senderAddress],
      };
    });
    
    try {
      const signedTxns = await peraWallet.signTransaction([txnsToSign]);
      console.log("Transactions signed successfully");
      
      // Submit transactions
      console.log("Submitting transactions...");
      const { txId } = await algodClient.sendRawTransaction(signedTxns).do();
      console.log(`Transactions submitted with ID: ${txId}`);
      
      // Wait for confirmation
      console.log("Waiting for confirmation...");
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 10);
      console.log(`Transaction confirmed in round: ${confirmedTxn['confirmed-round']}`);
      
      return txId;
    } catch (error) {
      console.error("Error signing or submitting transactions:", error);
      throw new Error(`Failed to sign or submit transactions: ${error.message || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Error in buyPropertyAction:", error);
    throw new Error(`Failed to buy property: ${error.message || "Unknown error"}`);
  }
};

// RATE PROPERTY: ApplicationCallTxn
export const ratePropertyAction = async (senderAddress, property, rate) => {
  console.log("Rating property...");
  console.log("Sender address:", senderAddress);
  console.log("Property:", property);
  console.log("Rating:", rate);

  try {
    // Get transaction params
    const params = await algodClient.getTransactionParams().do();
    console.log("Transaction params:", params);
    
    // Build required app args as Uint8Array
    let rateArg = new TextEncoder().encode("rate");
    
    // Handle rate encoding with a fallback method
    let ratesArg;
    try {
      // Try the standard method first
      ratesArg = algosdk.encodeUint64(rate);
    } catch (error) {
      console.log("Standard uint64 encoding failed for rating, using alternative method");
      // Alternative method without BigInt
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      
      // Ensure rate is a number and within safe range
      const rateNumber = Number(rate);
      if (isNaN(rateNumber) || rateNumber < 0) {
        throw new Error("Rating must be a positive number");
      }
      
      // Manual encoding of 64-bit integer (big-endian)
      const high = Math.floor(rateNumber / 4294967296); // 2^32
      const low = rateNumber % 4294967296;
      
      view.setUint32(0, high, false); // high 32 bits
      view.setUint32(4, low, false);  // low 32 bits
      ratesArg = new Uint8Array(buffer);
    }
    
    let appArgs = [rateArg, ratesArg];
    
    // Create ApplicationCallTxn
    let appCallTxn = algosdk.makeApplicationNoOpTxn(
      senderAddress,
      params,
      property.appId,
      appArgs
    );
    
    // Sign transaction with Pera wallet
    console.log("Signing transaction with Pera wallet...");
    const txnsToSign = [{
      txn: appCallTxn,
      signers: [senderAddress],
    }];
    
    try {
      const signedTxns = await peraWallet.signTransaction([txnsToSign]);
      console.log("Transaction signed successfully");
      
      // Submit transaction
      console.log("Submitting transaction...");
      const { txId } = await algodClient.sendRawTransaction(signedTxns).do();
      console.log(`Transaction submitted with ID: ${txId}`);
      
      // Wait for confirmation
      console.log("Waiting for confirmation...");
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 10);
      console.log(`Transaction confirmed in round: ${confirmedTxn['confirmed-round']}`);
      
      return txId;
    } catch (error) {
      console.error("Error signing or submitting transaction:", error);
      throw new Error(`Failed to sign or submit transaction: ${error.message || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Error in ratePropertyAction:", error);
    throw new Error(`Failed to rate property: ${error.message || "Unknown error"}`);
  }
};

// DELETE PRODUCT: ApplicationDeleteTxn
export const deletePropertyAction = async (senderAddress, index) => {
  console.log("Deleting application...");

  let params = await algodClient.getTransactionParams().do();

  // Create ApplicationDeleteTxn
  let txn = algosdk.makeApplicationDeleteTxnFromObject({
    from: senderAddress,
    suggestedParams: params,
    appIndex: index,
  });

  // Get transaction ID
  let txId = txn.txID().toString();

  // Sign & submit the transaction
  let signedTxn = await peraWallet.signTransaction([{ txn }]);
  console.log("Signed transaction with txID: %s", txId);
  await algodClient.sendRawTransaction(signedTxn).do();

  // Wait for transaction to be confirmed
  const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

  // Get the completed Transaction
  console.log(
    "Transaction " +
      txId +
      " confirmed in round " +
      confirmedTxn["confirmed-round"]
  );

  // Get application id of deleted application and notify about completion
  let transactionResponse = await algodClient
    .pendingTransactionInformation(txId)
    .do();
  let appId = transactionResponse["txn"]["txn"].apid;
  console.log("Deleted app-id: ", appId);
};

// GET PROPERTIES: Use indexer
export const getPropertiesAction = async () => {
  console.log("Fetching properties...");
  const properties = [];
  
  // First try to load properties from localStorage
  try {
    const savedAppIds = JSON.parse(localStorage.getItem('propertyAppIds') || '[]');
    console.log(`Found ${savedAppIds.length} saved property IDs in local storage`);
    
    if (savedAppIds.length > 0) {
      // Fetch properties by their app IDs
      for (const appId of savedAppIds) {
        try {
          console.log(`Fetching property ${appId} directly...`);
          const property = await getApplication(appId);
          if (property) {
            properties.push(property);
            console.log(`Added property from storage: ${property.title}`);
          }
        } catch (error) {
          console.error(`Error fetching property ${appId}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error loading properties from localStorage:", error);
  }
  
  // Only try the indexer if we don't have properties from localStorage
  if (properties.length === 0) {
    try {
      // Create the encoded note for searching
      const encodedNote = new TextEncoder().encode(propertyDappNote);
      
      console.log("Searching for property transactions with smaller limit...");
      const response = await indexerClient
        .searchForTransactions()
        .notePrefix(encodedNote)
        .txType("appl")
        .minRound(minRound)
        .limit(10) // Reduced limit to avoid timeout
        .do();
      
      console.log(`Found ${response.transactions.length} property transactions`);
      
      // Process transactions to get property details
      const appIds = [];
      for (const transaction of response.transactions) {
        if (transaction["application-index"]) {
          const appId = transaction["application-index"];
          appIds.push(appId);
          
          // Only fetch if we don't already have this property
          if (!properties.some(p => p.appId === appId)) {
            try {
              console.log(`Fetching details for property ${appId}...`);
              const property = await getApplication(appId);
              if (property) {
                properties.push(property);
                console.log(`Added property: ${property.title}`);
              }
            } catch (error) {
              console.warn(`Error fetching property ${appId}:`, error);
            }
          }
        }
      }
      
      // Save the app IDs to localStorage for future use
      try {
        // Merge with existing IDs and remove duplicates
        const existingIds = JSON.parse(localStorage.getItem('propertyAppIds') || '[]');
        const allIds = [...new Set([...existingIds, ...appIds])];
        localStorage.setItem('propertyAppIds', JSON.stringify(allIds));
        console.log(`Saved ${allIds.length} property IDs to localStorage`);
      } catch (error) {
        console.error("Error saving property IDs to localStorage:", error);
      }
    } catch (error) {
      console.error("Error in transaction search:", error);
      // Don't throw here, just log the error and continue with any properties we found
    }
  }
  
  console.log(`Total properties found: ${properties.length}`);
  return properties;
};

export const getApplication = async (appId) => {
  try {
    console.log(`Getting application details for appId: ${appId}`);
    // 1. Get application by appId
    let response = await indexerClient
      .lookupApplications(appId)
      .includeAll(true)
      .do();
      
    if (!response.application || response.application.deleted) {
      console.log(`Application ${appId} not found or deleted`);
      return null;
    }
    
    let globalState = response.application.params["global-state"];
    console.log(`Retrieved global state for application ${appId}`);

    // 2. Parse fields of response and return product
    let owner = response.application.params.creator;
    let title = "";
    let image = "";
    let location = "";
    let buyer = "";
    let price = 0;
    let rate = 0;
    let bought = 0;

    const getField = (fieldName, globalState) => {
      return globalState.find((state) => {
        return state.key === utf8ToBase64String(fieldName);
      });
    };

    if (getField("TITLE", globalState) !== undefined) {
      let field = getField("TITLE", globalState).value.bytes;
      title = base64ToUTF8String(field);
    }

    if (getField("IMAGE", globalState) !== undefined) {
      let field = getField("IMAGE", globalState).value.bytes;
      image = base64ToUTF8String(field);
    }

    if (getField("LOCATION", globalState) !== undefined) {
      let field = getField("LOCATION", globalState).value.bytes;
      location = base64ToUTF8String(field);
    }

    if (getField("PRICE", globalState) !== undefined) {
      price = getField("PRICE", globalState).value.uint;
    }

    if (getField("BOUGHT", globalState) !== undefined) {
      bought = getField("BOUGHT", globalState).value.uint;
    }

    if (getField("RATE", globalState) !== undefined) {
      rate = getField("RATE", globalState).value.uint;
    }

    if (getField("BUYER", globalState) !== undefined) {
      let field = getField("BUYER", globalState).value.bytes;
      buyer = base64ToUTF8String(field);
    }

    console.log(`Successfully parsed property: ${title}`);
    return new Property(
      title,
      image,
      location,
      price,
      bought,
      rate,
      buyer,
      appId,
      owner
    );
  } catch (err) {
    console.error(`Error in getApplication for appId ${appId}:`, err);
    return null;
  }
};

// Add a new function to get properties by direct app ID lookup
export const getPropertiesByAppIds = async (appIds) => {
  console.log(`Fetching ${appIds.length} properties by app IDs...`);
  const properties = [];
  
  for (const appId of appIds) {
    try {
      const property = await getApplication(appId);
      if (property) {
        properties.push(property);
        console.log(`Retrieved property ${property.title} (${appId})`);
      }
    } catch (error) {
      console.error(`Error fetching property ${appId}:`, error);
    }
  }
  
  console.log(`Retrieved ${properties.length} properties by direct lookup`);
  return properties;
};
