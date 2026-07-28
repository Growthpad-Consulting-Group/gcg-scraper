const bcrypt = require('bcryptjs');

// The password you want to hash
const password = '@GDCSecData$$';

// Generate the hashed password with salt rounds of 10
const hashedPassword = bcrypt.hashSync(password, 10);

// Log the generated hash
console.log('Generated Hash:', hashedPassword);
