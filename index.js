const express = require('express');
const { Storage } = require('@google-cloud/storage');
const path = require('path');

const bucketName = process.env.BUCKET_NAME;
const app = express();
const storage = new Storage();
const publicPath = path.join(__dirname, 'public');

// 정적 파일 서빙 (favicon.png 등을 public 폴더에 배치)
app.use(express.static(publicPath));

app.get('/api/files', async (req, res) => {
  try {
    const prefix = req.query.path || '';
    const [files, , apiResponse] = await storage.bucket(bucketName).getFiles({
      prefix: prefix,
      delimiter: '/'
    });

    const folders = (apiResponse.prefixes || []).map(p => ({
      name: p.replace(prefix, '').replace('/', ''),
      fullPath: p,
      type: 'folder'
    }));

    const fileList = await Promise.all(
      files.filter(file => file.name !== prefix).map(async (file) => {
        const fileName = file.name.replace(prefix, '');

        // 1. 열기용 URL (Inline)
        const [viewUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 15 * 60 * 1000,
        });

        // 2. 다운로드용 URL (Attachment 강제)
        const [downloadUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 15 * 60 * 1000,
          extensionHeaders: {
            'response-content-disposition': `attachment; filename="${encodeURIComponent(fileName)}"`
          }
        });

        return {
          name: fileName,
          fullPath: file.name,
          viewUrl: viewUrl,
          downloadUrl: downloadUrl,
          type: 'file',
          size: parseInt(file.metadata.size),
          updated: file.metadata.updated,
          contentType: file.metadata.contentType
        };
      })
    );

    res.json({ bucketName, currentPath: prefix, folders, files: fileList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

    // 버킷명과 함께 데이터 반환
    res.json({
      bucketName: bucketName,
      currentPath: prefix,
      folders: folders,
      files: fileList
    });
  } catch (error) {
    console.error("GCS Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 모든 경로를 index.html로 리다이렉트 (SPA 대응)
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Cloud Run Functions 진입점
exports.gcsFileApp = app;