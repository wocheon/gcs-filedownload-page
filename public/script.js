let bucketName = "";

async function loadFiles(path = '') {
    try {
        const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
        if (!res.ok) throw new Error('네트워크 응답 에러');
        
        const data = await res.json();
        bucketName = data.bucketName;
        
        document.getElementById('header-bucket-name').innerText = `gs://${bucketName}`;
        renderBreadcrumb(path);
        
        const listBody = document.getElementById('file-list-body');
        listBody.innerHTML = '';
        document.getElementById('detail-side-panel').classList.remove('active');

        if (path !== '') {
            const parts = path.split('/').filter(Boolean);
            parts.pop();
            const parentPath = parts.length > 0 ? parts.join('/') + '/' : '';
            
            const tr = document.createElement('tr');
            tr.className = 'parent-row';
            tr.innerHTML = `<td colspan="3">📁 .. (상위 디렉토리로)</td>`;
            tr.onclick = (e) => { e.stopPropagation(); loadFiles(parentPath); };
            listBody.appendChild(tr);
        }

        const items = [...data.folders, ...data.files];
        items.forEach(item => {
            const tr = document.createElement('tr');
            const dateStr = item.updated ? new Date(item.updated).toLocaleDateString() : '-';
            
            tr.innerHTML = `
                <td>${item.type === 'folder' ? '📁' : '📄'} ${item.name}</td>
                <td>${item.type === 'folder' ? '폴더' : '파일'}</td>
                <td>${dateStr}</td>
            `;

            tr.onclick = () => {
                if (item.type === 'folder') loadFiles(item.fullPath);
                else showFileDetail(item);
            };
            listBody.appendChild(tr);
        });
    } catch (error) {
        console.error('로드 실패:', error);
    }
}

function renderBreadcrumb(path) {
    const container = document.getElementById('breadcrumb-container');
    container.innerHTML = `<span onclick="loadFiles('')">gs://${bucketName}</span>`;
    if (!path) return;

    let accumulatedPath = '';
    const segments = path.split('/').filter(Boolean);
    segments.forEach((seg) => {
        accumulatedPath += seg + '/';
        const target = accumulatedPath;
        container.innerHTML += `<span class="sep">/</span><span onclick="loadFiles('${target}')">${seg}</span>`;
    });
}

function showFileDetail(file) {
    const panel = document.getElementById('detail-side-panel');
    panel.classList.add('active');
    
    document.getElementById('view-name').innerText = file.name;
    document.getElementById('view-path').innerText = `gs://${bucketName}/${file.fullPath}`;
    document.getElementById('view-type').innerText = file.contentType || '알 수 없음';
    document.getElementById('view-size').innerText = formatBytes(file.size);
    document.getElementById('view-updated').innerText = new Date(file.updated).toLocaleString();
    
    document.getElementById('link-view').href = file.viewUrl;
    document.getElementById('link-download').href = file.downloadUrl;
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

loadFiles();