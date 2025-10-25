const UploadRequirement = require("../models/UploadRequirement");
const Submission = require("../models/Submission");
const Template = require("../models/Template");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");

// Upload Requirements
const getAllUploadRequirements = async (req, res) => {
  try {
    const requirements = await UploadRequirement.find().sort({ createdAt: -1 });
    res.json(requirements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createUploadRequirement = async (req, res) => {
  try {
    const requirement = new UploadRequirement(req.body);
    await requirement.save();
    res.json(requirement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUploadRequirement = async (req, res) => {
  try {
    const requirement = await UploadRequirement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(requirement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteUploadRequirement = async (req, res) => {
  try {
    const requirementId = req.params.id;
    const submissions = await Submission.find({ requirementId });
    
    for (const submission of submissions) {
      if (submission.cloudinaryPublicId) {
        try {
          let result = await cloudinary.uploader.destroy(submission.cloudinaryPublicId, { resource_type: 'raw' });
          if (result.result === 'not found') {
            result = await cloudinary.uploader.destroy(submission.cloudinaryPublicId);
          }
        } catch (cloudinaryError) {
          console.error(`Cloudinary deletion error:`, cloudinaryError);
        }
      }
    }
    
    await Submission.deleteMany({ requirementId });
    await UploadRequirement.findByIdAndDelete(requirementId);
    
    res.json({ message: "Upload requirement and all submissions deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// File Submissions
const uploadFile = async (req, res) => {
  try {
    const { batchName } = req.body;
    
    if (!batchName || !req.file) {
      return res.status(400).json({ error: 'Batch name and file are required' });
    }
    
    // Get upload requirement to check allowed formats
    const requirement = await UploadRequirement.findById(req.params.requirementId);
    if (!requirement) {
      return res.status(404).json({ error: 'Upload requirement not found' });
    }
    
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    // Check file format
    if (requirement.allowedFormats && requirement.allowedFormats.length > 0) {
      if (!requirement.allowedFormats.includes(fileExt)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          error: `File format ${fileExt} not allowed. Allowed formats: ${requirement.allowedFormats.join(', ')}` 
        });
      }
    }
    
    const existingSubmission = await Submission.findOne({
      requirementId: req.params.requirementId,
      batchName: batchName
    });
    
    if (existingSubmission && existingSubmission.isLocked) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'File upload is locked. Contact head to unlock.' });
    }
    const cleanBatchName = batchName.replace(/\s+/g, '_');
    const cleanFileName = req.file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._]/g, '_');
    const fileNameWithoutExt = cleanFileName.substring(0, cleanFileName.lastIndexOf('.')) || cleanFileName;
    
    // Use 'raw' resource type for PDFs and documents
    const resourceType = ['.pdf', '.doc', '.docx', '.txt'].includes(fileExt) ? 'raw' : 'auto';
    
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: `team_uploads/${cleanBatchName}`,
      public_id: `${cleanBatchName}_${fileNameWithoutExt}`,
      resource_type: resourceType,
      access_mode: "public"
    });
    
    fs.unlinkSync(req.file.path);
    
    if (existingSubmission) {
      if (existingSubmission.cloudinaryPublicId) {
        try {
          let result = await cloudinary.uploader.destroy(existingSubmission.cloudinaryPublicId, { resource_type: 'raw' });
          if (result.result === 'not found') {
            result = await cloudinary.uploader.destroy(existingSubmission.cloudinaryPublicId);
          }
        } catch (error) {
          console.error('Error deleting old file:', error);
        }
      }
      
      existingSubmission.fileName = req.file.originalname;
      existingSubmission.originalName = req.file.originalname;
      existingSubmission.filePath = result.secure_url;
      existingSubmission.cloudinaryPublicId = result.public_id;
      existingSubmission.uploadedAt = new Date();
      existingSubmission.isLocked = true;
      await existingSubmission.save();
      
      return res.json({ message: "File replaced and locked successfully", submission: existingSubmission });
    }
    
    const submission = new Submission({
      requirementId: req.params.requirementId,
      batchName,
      fileName: req.file.originalname,
      originalName: req.file.originalname,
      filePath: result.secure_url,
      cloudinaryPublicId: result.public_id,
      isLocked: true
    });
    
    await submission.save();
    res.json({ message: "File uploaded and locked successfully", submission });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find().populate('requirementId');
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const downloadFile = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ error: "File not found" });
    }
    res.redirect(submission.filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const unlockSubmission = async (req, res) => {
  try {
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { isLocked: false },
      { new: true }
    );
    res.json({ message: "File upload unlocked", submission });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Templates
const getAllTemplates = async (req, res) => {
  try {
    const templates = await Template.find().sort({ uploadedAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const uploadTemplate = async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title || !req.file) {
      return res.status(400).json({ error: 'Title and file are required' });
    }
    
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const cleanTitle = title.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    // Use 'raw' resource type for PDFs and documents
    const resourceType = ['.pdf', '.doc', '.docx', '.txt'].includes(fileExt) ? 'raw' : 'auto';
    
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'templates',
      public_id: cleanTitle,
      resource_type: resourceType,
      access_mode: "public"
    });
    
    fs.unlinkSync(req.file.path);
    
    const template = new Template({
      title,
      description: description || '',
      fileName: req.file.originalname,
      originalName: req.file.originalname,
      filePath: result.secure_url,
      cloudinaryPublicId: result.public_id
    });
    
    await template.save();
    res.json({ message: "Template uploaded successfully", template });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const { title, description } = req.body;
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    template.title = title || template.title;
    template.description = description !== undefined ? description : template.description;
    
    if (req.file) {
      if (template.cloudinaryPublicId) {
        try {
          let result = await cloudinary.uploader.destroy(template.cloudinaryPublicId, { resource_type: 'raw' });
          if (result.result === 'not found') {
            result = await cloudinary.uploader.destroy(template.cloudinaryPublicId);
          }
        } catch (error) {
          console.error('Error deleting old template:', error);
        }
      }
      
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      const cleanTitle = (title || template.title).replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      
      // Use 'raw' resource type for PDFs and documents
      const resourceType = ['.pdf', '.doc', '.docx', '.txt'].includes(fileExt) ? 'raw' : 'auto';
      
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'templates',
        public_id: cleanTitle,
        resource_type: resourceType,
        access_mode: "public"
      });
      
      fs.unlinkSync(req.file.path);
      
      template.fileName = req.file.originalname;
      template.originalName = req.file.originalname;
      template.filePath = result.secure_url;
      template.cloudinaryPublicId = result.public_id;
    }
    
    await template.save();
    res.json({ message: "Template updated successfully", template });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    if (template.cloudinaryPublicId) {
      try {
        let result = await cloudinary.uploader.destroy(template.cloudinaryPublicId, { resource_type: 'raw' });
        if (result.result === 'not found') {
          result = await cloudinary.uploader.destroy(template.cloudinaryPublicId);
        }
      } catch (cloudinaryError) {
        console.error(`Cloudinary deletion error:`, cloudinaryError);
      }
    }
    
    await Template.findByIdAndDelete(req.params.id);
    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const downloadTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.redirect(template.filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllUploadRequirements,
  createUploadRequirement,
  updateUploadRequirement,
  deleteUploadRequirement,
  uploadFile,
  getAllSubmissions,
  downloadFile,
  unlockSubmission,
  getAllTemplates,
  uploadTemplate,
  updateTemplate,
  deleteTemplate,
  downloadTemplate
};