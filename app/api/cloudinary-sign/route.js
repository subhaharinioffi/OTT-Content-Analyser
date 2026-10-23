import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'czqgne9x',
  api_key: process.env.CLOUDINARY_API_KEY || '443963171659555',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'VXFDFUdd3lqVGY4d6Lyjo8uft88',
  secure: true,
});

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'ott-guidelines';

    const paramsToSign = {
      folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET || 'VXFDFUdd3lqVGY4d6Lyjo8uft88'
    );

    return NextResponse.json({
      signature,
      timestamp,
      folder,
      apiKey: process.env.CLOUDINARY_API_KEY || '443963171659555',
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'czqgne9x',
    });
  } catch (error) {
    console.error('[Sign API Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
