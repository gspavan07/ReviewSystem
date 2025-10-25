const cloudinary = require("../config/cloudinary");
const Submission = require("../models/Submission");
const Template = require("../models/Template");

const fixCloudinaryAccess = async (req, res) => {
  try {
    console.log("Starting Cloudinary access fix...");
    
    // Fix submissions
    const submissions = await Submission.find({ cloudinaryPublicId: { $exists: true } });
    let fixedSubmissions = 0;
    let reuploadedPDFs = 0;
    
    for (const submission of submissions) {
      try {
        const isPDF = submission.fileName && submission.fileName.toLowerCase().endsWith('.pdf');
        
        if (isPDF) {
          // For PDFs, update URL to use raw delivery format
          try {
            const publicId = submission.cloudinaryPublicId;
            const newUrl = `https://res.cloudinary.com/dw9uzgs5g/raw/upload/${publicId}`;
            
            // Update submission with corrected URL
            submission.filePath = newUrl;
            await submission.save();
            
            reuploadedPDFs++;
            console.log(`Fixed PDF URL: ${submission.cloudinaryPublicId}`);
          } catch (urlFixError) {
            console.error(`Failed to fix PDF URL ${submission.cloudinaryPublicId}:`, urlFixError.message);
          }
        } else {
          // For non-PDFs, try to fix access mode
          try {
            await cloudinary.uploader.explicit(submission.cloudinaryPublicId, {
              type: "upload",
              resource_type: "image",
              access_mode: "public"
            });
            fixedSubmissions++;
            console.log(`Fixed submission: ${submission.cloudinaryPublicId}`);
          } catch (error) {
            console.error(`Failed to fix submission ${submission.cloudinaryPublicId}:`, error.message);
          }
        }
      } catch (error) {
        console.error(`Error processing submission ${submission.cloudinaryPublicId}:`, error.message);
      }
    }
    
    // Fix templates
    const templates = await Template.find({ cloudinaryPublicId: { $exists: true } });
    let fixedTemplates = 0;
    let reuploadedTemplatePDFs = 0;
    
    for (const template of templates) {
      try {
        const isPDF = template.fileName && template.fileName.toLowerCase().endsWith('.pdf');
        
        if (isPDF) {
          // For PDFs, update URL to use raw delivery format
          try {
            const publicId = template.cloudinaryPublicId;
            const newUrl = `https://res.cloudinary.com/dw9uzgs5g/raw/upload/${publicId}`;
            
            // Update template with corrected URL
            template.filePath = newUrl;
            await template.save();
            
            reuploadedTemplatePDFs++;
            console.log(`Fixed template PDF URL: ${template.cloudinaryPublicId}`);
          } catch (urlFixError) {
            console.error(`Failed to fix template PDF URL ${template.cloudinaryPublicId}:`, urlFixError.message);
          }
        } else {
          // For non-PDFs, try to fix access mode
          try {
            await cloudinary.uploader.explicit(template.cloudinaryPublicId, {
              type: "upload",
              resource_type: "image",
              access_mode: "public"
            });
            fixedTemplates++;
            console.log(`Fixed template: ${template.cloudinaryPublicId}`);
          } catch (error) {
            console.error(`Failed to fix template ${template.cloudinaryPublicId}:`, error.message);
          }
        }
      } catch (error) {
        console.error(`Error processing template ${template.cloudinaryPublicId}:`, error.message);
      }
    }
    
    res.json({
      message: "Cloudinary access fix completed",
      fixedSubmissions,
      fixedTemplates,
      reuploadedPDFs,
      reuploadedTemplatePDFs,
      totalFixed: fixedSubmissions + fixedTemplates + reuploadedPDFs + reuploadedTemplatePDFs
    });
    
  } catch (error) {
    console.error("Error fixing Cloudinary access:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { fixCloudinaryAccess };