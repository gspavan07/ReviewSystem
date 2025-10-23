const multer = require("multer");

// Excel upload storage
const excelStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Temporary storage for file uploads
const tempStorage = multer({ dest: 'temp/' });

const uploadExcel = multer({ storage: excelStorage });

module.exports = { uploadExcel, tempStorage };