const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const app = express();
const tf = require('@tensorflow/tfjs');
const cors = require('cors');
const constData = require('./constData');

// Enable CORS for all origins
app.use(cors());

// Or enable CORS for specific origin
app.use(cors({
  origin: 'http://localhost:4200' // Allow only this origin
}));

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// MySQL Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'coupon123',
  database: 'chatbot_db',
});

db.connect((err) => {
  if (err) throw err;
  console.log('MySQL Connected...');
});

// Define some example queries, responses, and categories
/*const queries = ["Hi", "How are you?", "what is your name?"];
const responses = ["Hello", "I am fine", "I am Ashutosh! your personal assistant"];
const categories = ["greeting", "status", "farewell"]; */


// Tokenization and padding logic for input queries
const vocabulary = {};
let vocabIndex = 1;

constData.queries.forEach(query => {
  query.split(' ').forEach(word => {
    if (!vocabulary[word]) {
      vocabulary[word] = vocabIndex++;
    }
  });
});

function tokenize(text) {
  return text.split(' ').map(word => vocabulary[word] || 0); // Use 0 for unknown words
}

function padSequences(sequences, maxLength) {
  return sequences.map(seq => {
    const pad = Array(maxLength - seq.length).fill(0); // Padding with 0
    return [...seq, ...pad];
  });
}

// Tokenize and pad training data
const tokenizedQueries = constData.queries.map(query => tokenize(query));
const maxLength = Math.max(...tokenizedQueries.map(seq => seq.length)); // Ensure consistent maxLength
console.log("Max length of sequences:", maxLength);
const paddedQueries = padSequences(tokenizedQueries, maxLength);

// Convert training data to tensor
const trainingData = tf.tensor2d(paddedQueries, [paddedQueries.length, maxLength]);

// One-hot encode labels
const labelMapping = constData.labelMapping;  // { "greeting": 0, "status": 1, "farewell": 2 };
const oneHotLabels = constData.categories.map(category => {
  const encoded = Array(Object.keys(labelMapping).length).fill(0); // Adjust the size dynamically
  encoded[labelMapping[category]] = 1;
  return encoded;
});

const trainingLabels = tf.tensor2d(oneHotLabels, [oneHotLabels.length, Object.keys(labelMapping).length]);

let model;

// Model training logic
async function trainModel() {
  const inputSize = trainingData.shape[1]; // Number of features (input size)
  const outputSize = trainingLabels.shape[1]; // Number of categories (output size)

  // Create and compile the model
  model = tf.sequential();
  model.add(tf.layers.dense({ units: 128, inputShape: [inputSize], activation: 'relu' }));
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: outputSize, activation: 'softmax' }));

  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  // Train the model
  await model.fit(trainingData, trainingLabels, {
    epochs: 100,
    batchSize: 32,
  });

  console.log('Model training complete!');
  return model;
}

// Call the training function to train the model once when the server starts
trainModel();

// Example AI Training function (use the previously trained model)
async function generateResponsenew(query, category) {
  let sql;
  let response;
  const employeeId = extractEmployeeId(query);
  const employeeName = JSON.stringify(extractEmployeeName(query));
 
  switch (category) {
    case 'employee_list':
       // Assuming this extracts the employee ID
      sql = 'SELECT name FROM employee';
      response = await new Promise((resolve, reject) => {
        db.query(sql, (err, results) => {
          if (err) return reject(err);  // Handle error
          resolve(JSON.parse(JSON.stringify(results)));  // Resolve the results
        });
      });
      break;

    case 'employee_details':
      sql = `SELECT department FROM employee WHERE name = '${employeeName}'`;
      response = await new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
          if (err) return reject(err);
          if (result.length > 0) {
            resolve(result[0]);
          } else {
            resolve(`No employee found with name ${employeeName}`);
          }
        });
      });
      break;

    case 'employee_count':
      sql = 'SELECT COUNT(*) AS employee_count FROM employee';
      response = await new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
          if (err) return reject(err);
          resolve(`There are ${result[0].employee_count} employees in the company.`);
        });
      });
      break;
    
  case 'update_salary':
      const newSalary = 60000; // Example new salary
      sql = `UPDATE employee SET salary = ${newSalary} WHERE employee_id = ${employeeId}`;
      response = await new Promise((resolve, reject) => {
        db.query(sql, (err) => {
          if (err) return reject(err);
          resolve(`Updated salary of employee ID ${employeeId} to ${newSalary}`);
        });
      });
      break;

    case 'employee_manager':
      sql = `SELECT reporting_manager FROM employee WHERE employee_id = ${employeeId}`;
      response = await new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
          if (err) return reject(err);
          if (result.length > 0) {
            resolve(`The manager of employee ID ${employeeId} is ${result[0].reporting_manager}`);
          } else {
            resolve(`No manager found for employee ID ${employeeId}`);
          }
        });
      });
      break;

    case 'employee_department':
      sql = `SELECT department FROM employee WHERE employee_id = ${employeeId}`;
      response = await new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
          if (err) return reject(err);
          if (result.length > 0) {
            resolve(`Employee ID ${employeeId} works in the ${result[0].department} department.`);
          } else {
            resolve(`No department found for employee ID ${employeeId}`);
          }
        });
      });
      break;

    case 'leave_balance':
      sql = `SELECT leave_balance FROM leavebalance WHERE employee_id = ${employeeId}`;
      response = await new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
          if (err) return reject(err);
          if (result.length > 0) {
            resolve(`Employee ID ${employeeId} has ${result[0].leave_balance} days of leave balance.`);
          } else {
            resolve(`No leave balance found for employee ID ${employeeId}`);
          }
        });
      });
      break;

    case 'employee_contact':
      sql = `SELECT email FROM employee WHERE name = '${employeeName}'`;
      response = await new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
          if (err) return reject(err);
          if (result.length > 0) {
            resolve(`The contact details of ${employeeName} are ${result[0].contact}`);
          } else {
            resolve(`No contact details found for ${employeeName}`);
          }
        });
      });
      break;

    case 'employee_designation':
      sql = `SELECT designation FROM employee WHERE employee_id = ${employeeId}`;
      response = await new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
          if (err) return reject(err);
          if (result.length > 0) {
            resolve(`Employee ID ${employeeId} holds the position of ${result[0].designation}`);
          } else {
            resolve(`No designation found for employee ID ${employeeId}`);
          }
        });
      });
      break;

    case 'employee_salary':
      // Assuming employee ID is part of the query, you would extract the ID dynamically
      sql = `SELECT salary_amount FROM salary WHERE employee_id = ${employeeId}`;
      response = await new Promise((resolve, reject) => {
        db.query(sql, (err, results) => {
          console.log(results);
          if (err) return reject(err);  // Handle error
          if (results.length > 0) {
            resolve(`The salary of employee ID ${employeeId} is ${JSON.parse(JSON.stringify(results))}`);
          } else {
            resolve(`No employee found with ID ${employeeId}`);
          }
        });
      });
      break;  

    default:
      response = "I don't understand that query.";
      break;
  }

  return response;
}

// Generate a response using the trained model

/*async function generateResponse(query) {
  if (!model) {
    return 'Model is not ready yet!';
  }

  const tokenizedQuery = tokenize(query);
  const paddedQuery = padSequences([tokenizedQuery], maxLength); // Ensure same maxLength
  const inputTensor = tf.tensor2d(paddedQuery, [1, maxLength]);  // Shape must be [1, maxLength]

  const prediction = model.predict(inputTensor);
  const predictionArray = prediction.arraySync()[0];

  // Find the category with the highest prediction score
  const categoryIndex = predictionArray.indexOf(Math.max(...predictionArray));
  const response = responses[categoryIndex];

  return response || "I don't understand.";
} */

  // Function to classify a query using the trained model
async function classifyQuery(query) {
  if (!model) {
    throw new Error("Model is not ready yet!");
  }

  // Step 1: Tokenize the input query
  const tokenizedQuery = tokenize(query);

  // Step 2: Pad the tokenized query to match the model's expected input length
  const paddedQuery = padSequences([tokenizedQuery], maxLength); // Ensure it matches the maxLength used during training

  // Step 3: Convert the padded query into a tensor
  const inputTensor = tf.tensor2d(paddedQuery, [1, maxLength]);  // Shape must be [1, maxLength] for a single query

  // Step 4: Use the model to make a prediction
  const prediction = model.predict(inputTensor);

  // Step 5: Get the predicted category index (the one with the highest probability)
  const predictionArray = prediction.arraySync()[0]; // Get array of probabilities
  const categoryIndex = predictionArray.indexOf(Math.max(...predictionArray)); // Find index of highest value

  // Step 6: Map the category index to the actual category name
  const predictedCategory = Object.keys(labelMapping).find(key => labelMapping[key] === categoryIndex);

  return predictedCategory;
}




// API endpoint to handle incoming queries

/*app.post('/query', async (req, res) => {
  const query = req.body.query;
  
  // Save query to the database
  const sql = 'INSERT INTO constData.queries SET ?';
  const post = { query_text: query };
  
  db.query(sql, post, async (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Generate AI-based response
    const response = await generateResponse(query);
    res.json({ response });
  });
}); */

// Example: Extract Employee ID dynamically from query
function extractEmployeeId(query) {
  // Match the phrase "ID" followed by digits, ensuring spaces are optional
  const idMatch = query.match(/\bID\s*(\d+)\b/i);
  return idMatch ? parseInt(idMatch[1], 10) : null;  // Parse ID if found, else return null
}

// Example: Extract Employee Name dynamically from query
function extractEmployeeName(query) {
  // Match the phrase "details of" followed by one or more words (potentially a name with spaces)
  const nameMatch = query.match(/details of ([a-zA-Z ]+)/i);
  return nameMatch ? nameMatch[1].trim() : null;

}

app.post('/query', async (req, res) => {
  const query = req.body.query;
  try {
    const predictedCategory = await classifyQuery(query); // Classify the user's query
    const response = await generateResponsenew(query, predictedCategory); // Fetch response dynamically based on category
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Start the server
app.listen(3000, () => {
  console.log('Server started on port 3000');
});
