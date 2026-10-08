import cloudinary
import cloudinary.uploader
import os

# Cloudinary configuration (Render env variables থেকে লোড হবে)
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)


def upload_pdf_to_cloudinary(file_bytes: bytes, filename: str) -> str:
    """
    PDF ফাইল Cloudinary তে upload করে এবং public URL return করে
    """
    try:
        # ফাইলের নাম থেকে .pdf extension সরানো
        clean_name = filename.replace(".pdf", "").replace(" ", "_")
        
        result = cloudinary.uploader.upload(
            file_bytes,
            resource_type="raw",              # PDF এর জন্য "raw" ব্যবহার হয়
            folder="edutrack/materials",      # Cloudinary তে folder তৈরি হবে
            public_id=clean_name,
            use_filename=True,
            unique_filename=True,             # একই নাম হলে auto-rename হবে
            overwrite=False,
        )
        return result["secure_url"]           # HTTPS URL return হবে
    except Exception as e:
        print(f"❌ Cloudinary upload error: {e}")
        raise Exception(f"Upload failed: {str(e)}")


def delete_pdf_from_cloudinary(file_url: str) -> bool:
    """
    PDF URL থেকে Cloudinary তে থাকা file delete করে
    """
    try:
        # URL থেকে public_id বের করা
        # Example: https://res.cloudinary.com/.../raw/upload/v123/edutrack/materials/file_abc.pdf
        parts = file_url.split("/upload/")
        if len(parts) < 2:
            return False
        
        public_id_with_version = parts[1]
        # v123/edutrack/materials/file_abc.pdf → edutrack/materials/file_abc
        public_id = "/".join(public_id_with_version.split("/")[1:]).replace(".pdf", "")
        
        cloudinary.uploader.destroy(public_id, resource_type="raw")
        return True
    except Exception as e:
        print(f"⚠️ Cloudinary delete error: {e}")
        return False