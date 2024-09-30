// Example queries, responses, and categories for AI training
exports.queries = [
    "Show me the list of employees",
    "What is the salary of employee ID 123?",
    "Give me the details of John Doe",
    "How many employees are in the company?",
    "Can you update the salary of employee ID 123?",
    "Who is the manager of employee ID 456?",
    "Show me the department of employee ID 789",
    "I need the leave balance of employee ID 123",
    "Give me the contact details of John Doe",
    "What is the designation of employee ID 123?"
  ];


  // Corresponding categories for each query
exports.categories = [
    "employee_list",
    "employee_salary",
    "employee_details",
    "employee_count",
    "update_salary",
    "employee_manager",
    "employee_department",
    "leave_balance",
    "employee_contact",
    "employee_designation"
  ];
  
  // Dummy category mappings
  exports.labelMapping = {
    "employee_list": 0,
    "employee_salary": 1,
    "employee_details": 2,
    "employee_count": 3,
    "update_salary": 4,
    "employee_manager": 5,
    "employee_department": 6,
    "leave_balance": 7,
    "employee_contact": 8,
    "employee_designation": 9
  };


 