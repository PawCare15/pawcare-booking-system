// 统一放在页面所有 <script> 的最顶部
(function checkAuth() {
    // 定义检查函数
    function doAuthCheck() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        let shouldRedirect = false;
        let redirectUrl = 'index.html';

        if (!token) {
            shouldRedirect = true;
            redirectUrl = 'index.html';
        } else {
            try {
                const userData = JSON.parse(user);
                if (userData.role !== 'admin') {
                    shouldRedirect = true;
                    redirectUrl = 'dashboard.html';
                }
            } catch {
                shouldRedirect = true;
                redirectUrl = 'dashboard.html';
            }
        }

        if (shouldRedirect) {
            // 清空整个页面
            document.documentElement.innerHTML = `
                <html>
                    <head><title>Redirecting...</title></head>
                    <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#FAF7F2;color:#4A3327;">
                        Redirecting...
                    </body>
                </html>
            `;
            window.location.replace(redirectUrl);
        }
    }

    // 页面初次加载执行
    doAuthCheck();

    // 监听 pageshow 事件，处理 bfcache 恢复
    window.addEventListener('pageshow', function(event) {
        // 如果页面是从 bfcache 恢复，重新执行检查
        if (event.persisted) {
            doAuthCheck();
        }
    });
})();

// SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://hrosrmkzzaqhuowrqegz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhyb3NybWt6emFxaHVvd3JxZWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0OTQ1OTMsImV4cCI6MjEwMTA3MDU5M30.53e8JDMj0AId0zyFslIf9h1UmonG5zLJHyipzS28EKk';

// WRAPPER FOR API CALLS WITH TOKEN
async function authFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('login.html');
        return;
    }
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
        localStorage.clear();
        window.location.replace('login.html');
        throw new Error('Unauthorized');
    }
    return response;
}

// SUPABASE DIRECT QUERY FUNCTIONS
async function supabaseQuery(query, params = []) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('login.html');
        return null;
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${query}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ params })
        });

        if (!response.ok) {
            throw new Error(`Supabase query failed: ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        console.error('Supabase query error:', err);
        return null;
    }
}

// SCROLLBAR COMPENSATION FOR MODALS
let modalCount = 0;

function lockBodyScroll() {
    if (modalCount === 0) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = scrollbarWidth + 'px';
        }
        document.body.style.overflow = 'hidden';
    }
    modalCount++;
}

function unlockBodyScroll() {
    modalCount--;
    if (modalCount <= 0) {
        modalCount = 0;
        document.body.style.paddingRight = '';
        document.body.style.overflow = '';
    }
}

// LOGOUT FUNCTIONS
function showLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        lockBodyScroll();
        modal.classList.add('active');
    }
}

function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.remove('active');
        unlockBodyScroll();
    }
}

function confirmLogout() {
    localStorage.clear();
    closeLogoutModal();
    window.location.replace('index.html');
}

// CUSTOMER DATA - DROPDOWN OWNER
let customersData = [
    { id: '#CUS-0001', name: 'Jenny Lee', phone: '012-345 6789', email: 'jennylee@gmail.com' },
    { id: '#CUS-0002', name: 'Ahmad Firdaus', phone: '013-987 6543', email: 'ahmadf@gmail.com' },
    { id: '#CUS-0003', name: 'Siti Nur', phone: '013-987 6543', email: 'sitinur@gmail.com' },
    { id: '#CUS-0004', name: 'Daniel Tan', phone: '012-363 5768', email: 'danieltan@gmail.com' },
    { id: '#CUS-0005', name: 'Mei Ling', phone: '012-263 3289', email: 'meiling@gmail.com' },
    { id: '#CUS-0006', name: 'Nur Aishah', phone: '012-123 4567', email: 'nuraishah@gmail.com' },
    { id: '#CUS-0007', name: 'Jason Ho', phone: '012-456 7890', email: 'jasonho@gmail.com' },
    { id: '#CUS-0008', name: 'Farhan Rizal', phone: '012-789 0123', email: 'farhanr@gmail.com' }
];

// PET DATA - SAMPLE PETS
let petsData = [
    {
        id: '#PET-0001',
        name: 'Buddy',
        ownerId: '#CUS-0001',
        owner: 'Jenny Lee',
        species: 'Dog',
        breed: 'Golden Retriever',
        age: '3 Years',
        weight: '25 kg',
        status: 'Active',
        gender: 'Male',
        medicalNotes: 'No allergies. Healthy.',
        lastService: '10 May 2026 (Grooming)',
        totalBookings: 8,
        ownerPhone: '012-345 6789',
        ownerEmail: 'jennylee@gmail.com',
        image: ''
    },
    {
        id: '#PET-0002',
        name: 'Luna',
        ownerId: '#CUS-0002',
        owner: 'Ahmad Firdaus',
        species: 'Cat',
        breed: 'Persian',
        age: '2 Years',
        weight: '4.2 kg',
        status: 'Active',
        gender: 'Female',
        medicalNotes: 'Indoor cat. Shy with strangers.',
        lastService: '08 May 2026 (Grooming)',
        totalBookings: 5,
        ownerPhone: '013-987 6543',
        ownerEmail: 'ahmadf@gmail.com',
        image: ''
    },
    {
        id: '#PET-0003',
        name: 'Max',
        ownerId: '#CUS-0003',
        owner: 'Siti Nur',
        species: 'Dog',
        breed: 'Poodle',
        age: '4 Years',
        weight: '7.8 kg',
        status: 'Active',
        gender: 'Male',
        medicalNotes: 'Energetic. Loves treats.',
        lastService: '12 May 2026 (Grooming)',
        totalBookings: 6,
        ownerPhone: '013-987 6543',
        ownerEmail: 'sitinur@gmail.com',
        image: ''
    },
    {
        id: '#PET-0004',
        name: 'Coco',
        ownerId: '#CUS-0004',
        owner: 'Daniel Tan',
        species: 'Dog',
        breed: 'Shih Tzu',
        age: '5 Years',
        weight: '6.1 kg',
        status: 'Active',
        gender: 'Female',
        medicalNotes: 'Gentle and calm. Needs extra care for eyes.',
        lastService: '15 May 2026 (Grooming)',
        totalBookings: 4,
        ownerPhone: '012-363 5768',
        ownerEmail: 'danieltan@gmail.com',
        image: ''
    },
    {
        id: '#PET-0005',
        name: 'Charlie',
        ownerId: '#CUS-0005',
        owner: 'Mei Ling',
        species: 'Dog',
        breed: 'Beagle',
        age: '3 Years',
        weight: '10.2 kg',
        status: 'Active',
        gender: 'Male',
        medicalNotes: 'Very playful. Food motivated.',
        lastService: '05 May 2026 (Grooming)',
        totalBookings: 7,
        ownerPhone: '012-263 3289',
        ownerEmail: 'meiling@gmail.com',
        image: ''
    },
    {
        id: '#PET-0006',
        name: 'Milo',
        ownerId: '#CUS-0006',
        owner: 'Nur Aishah',
        species: 'Cat',
        breed: 'British Shorthair',
        age: '2 Years',
        weight: '5.0 kg',
        status: 'Active',
        gender: 'Male',
        medicalNotes: 'Loves to nap. Affectionate.',
        lastService: '09 May 2026 (Check-up)',
        totalBookings: 3,
        ownerPhone: '012-123 4567',
        ownerEmail: 'nuraishah@gmail.com',
        image: ''
    },
    {
        id: '#PET-0007',
        name: 'Rocky',
        ownerId: '#CUS-0007',
        owner: 'Jason Ho',
        species: 'Dog',
        breed: 'Pomeranian',
        age: '1 Year',
        weight: '3.5 kg',
        status: 'Active',
        gender: 'Male',
        medicalNotes: 'Small but brave. Needs gentle handling.',
        lastService: '11 May 2026 (Grooming)',
        totalBookings: 2,
        ownerPhone: '012-456 7890',
        ownerEmail: 'jasonho@gmail.com',
        image: ''
    },
    {
        id: '#PET-0008',
        name: 'Bella',
        ownerId: '#CUS-0008',
        owner: 'Farhan Rizal',
        species: 'Dog',
        breed: 'Bulldog',
        age: '4 Years',
        weight: '15.0 kg',
        status: 'Inactive',
        gender: 'Female',
        medicalNotes: 'Has skin allergy. Requires special shampoo.',
        lastService: '02 Apr 2026 (Grooming)',
        totalBookings: 1,
        ownerPhone: '012-789 0123',
        ownerEmail: 'farhanr@gmail.com',
        image: ''
    }
];

// VARIABLES
let currentPetId = null;
let isEditMode = false;
let tempImageData = null;

// GET CUSTOMER DROPDOWN OPTIONS
function getCustomerOptions(selectedId) {
    return customersData.map(customer => {
        const selected = customer.id === selectedId ? 'selected' : '';
        return `<option value="${customer.id}" ${selected}>${customer.name} (${customer.id})</option>`;
    }).join('');
}

// GET CUSTOMER BY ID
function getCustomerById(id) {
    return customersData.find(c => c.id === id);
}

// RENDER PET TABLE
function renderPetTable(data) {
    const tbody = document.getElementById('petTableBody');
    const countSpan = document.getElementById('petCount');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#7A7A7A; padding:20px;">No pets found</td></tr>`;
        if (countSpan) countSpan.textContent = '0';
        return;
    }
    
    if (countSpan) countSpan.textContent = data.length;
    
    tbody.innerHTML = data.map(pet => {
        const statusClass = pet.status.toLowerCase();
        const statusDisplay = pet.status;
        const speciesIcon = pet.species === 'Dog' ? 'fa-solid fa-dog' : 'fa-solid fa-cat';
        
        // USE PET IMAGE OR DEFAULT AVATAR
        const avatarHtml = pet.image ? 
            `<img src="${pet.image}" alt="${pet.name}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; flex-shrink:0;">` :
            `<div style="width:28px; height:28px; border-radius:50%; background:#FDF3E7; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:11px; color:#5A361A; flex-shrink:0;">${pet.name.charAt(0).toUpperCase()}</div>`;
        
        return `<tr>
            <td><strong>${pet.id}</strong></td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    ${avatarHtml}
                    ${pet.name}
                </div>
            </td>
            <td>${pet.owner}</td>
            <td><i class="${speciesIcon}" style="margin-right:4px; color:#5A361A;"></i> ${pet.species}</td>
            <td>${pet.breed}</td>
            <td>${pet.age}</td>
            <td>${pet.weight}</td>
            <td><span class="status-badge-sm ${statusClass}">${statusDisplay}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-sm btn-view" onclick="viewPetDetail('${pet.id}')" title="View Details">
                        <i class="fa-regular fa-eye"></i>
                    </button>
                    <button class="btn-sm btn-edit" onclick="openEditPetModal('${pet.id}')" title="Edit">
                        <i class="fa-regular fa-pen-to-square"></i>
                    </button>
                    <button class="btn-sm btn-delete" onclick="openDeleteModal('${pet.id}')" title="Delete">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// VIEW PET DETAIL
function viewPetDetail(id) {
    const pet = petsData.find(p => p.id === id);
    
    if (!pet) {
        alert('PET NOT FOUND!');
        return;
    }
    
    const modal = document.getElementById('petDetailModal');
    const content = document.getElementById('petDetailContent');
    
    const statusClass = pet.status.toLowerCase();
    const speciesIcon = pet.species === 'Dog' ? 'fa-solid fa-dog' : 'fa-solid fa-cat';
    
    // PET IMAGE FOR DETAIL VIEW
    const petImageHtml = pet.image ? 
        `<img src="${pet.image}" alt="${pet.name}" style="width:72px; height:72px; border-radius:50%; object-fit:cover; border:3px solid #EFE4D8;">` :
        `<div class="detail-modal-avatar" style="background:linear-gradient(135deg,#FDF3E7,#F5E6D3);">
            <i class="${speciesIcon}" style="font-size:34px; color:#5A361A;"></i>
        </div>`;
    
    content.innerHTML = `
        <div class="detail-modal-header">
            ${petImageHtml}
            <div>
                <div class="detail-modal-name">${pet.name}</div>
                <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:4px; align-items:center;">
                    <span class="detail-modal-id"><i class="fa-regular fa-id-card"></i> ${pet.id}</span>
                    <span style="font-size:12px; color:#8A7A6A;"><i class="fa-regular fa-calendar"></i> ${pet.breed}</span>
                    <span class="detail-modal-status ${statusClass}">${pet.status}</span>
                </div>
            </div>
        </div>
        
        <!-- OWNER INFORMATION -->
        <div class="detail-section">
            <div class="detail-section-title">
                <i class="fa-regular fa-user"></i> Owner Information
            </div>
            <div class="detail-info-grid">
                <div class="detail-info-item">
                    <span class="label">Owner Name</span>
                    <span class="value">${pet.owner}</span>
                </div>
                <div class="detail-info-item">
                    <span class="label">Phone</span>
                    <span class="value">${pet.ownerPhone || 'N/A'}</span>
                </div>
                <div class="detail-info-item full-width">
                    <span class="label">Email</span>
                    <span class="value">${pet.ownerEmail || 'N/A'}</span>
                </div>
            </div>
        </div>
        
        <!-- PET INFORMATION -->
        <div class="detail-section">
            <div class="detail-section-title">
                <i class="fa-solid fa-paw"></i> Pet Information
            </div>
            <div class="detail-info-grid">
                <div class="detail-info-item">
                    <span class="label">Gender</span>
                    <span class="value">${pet.gender || 'N/A'}</span>
                </div>
                <div class="detail-info-item">
                    <span class="label">Weight</span>
                    <span class="value">${pet.weight}</span>
                </div>
                <div class="detail-info-item full-width">
                    <span class="label">Medical Notes</span>
                    <span class="value">${pet.medicalNotes || 'No medical notes.'}</span>
                </div>
            </div>
        </div>
        
        <!-- PET HISTORY -->
        <div class="detail-section">
            <div class="detail-section-title">
                <i class="fa-regular fa-clock"></i> Pet History
            </div>
            <div class="detail-info-grid" style="grid-template-columns:1fr 1fr;">
                <div class="detail-info-item">
                    <span class="label">Last Service</span>
                    <span class="value" style="font-size:13px;">${pet.lastService || 'N/A'}</span>
                </div>
                <div class="detail-info-item full-width">
                    <span class="label">Total Bookings</span>
                    <span class="value" style="font-size:18px; font-weight:700; color:#5A361A;">${pet.totalBookings || 0}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-actions">
            <button class="btn btn-secondary" onclick="closePetDetail()">Close</button>
            <button class="btn btn-primary" onclick="closePetDetail(); openEditPetModal('${pet.id}')">
                <i class="fa-regular fa-pen-to-square"></i> Edit Pet
            </button>
            <button class="btn btn-danger" onclick="closePetDetail(); openDeleteModal('${pet.id}')">
                <i class="fa-regular fa-trash-can"></i> Delete Pet
            </button>
        </div>
    `;
    
    modal.classList.add('active');
    lockBodyScroll();
}

function closePetDetail() {
    const modal = document.getElementById('petDetailModal');
    modal.classList.remove('active');
    unlockBodyScroll();
}

// FORMAT AGE 
function formatAge(value) {
    const num = parseInt(value);
    if (isNaN(num) || num < 0) return '';
    if (num === 1) return '1 Year';
    return num + ' Years';
}

// FORMAT WEIGHT 
function formatWeight(value) {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return '';
    return num + ' kg';
}

// HANDLE IMAGE UPLOAD 
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // CHECK FILE SIZE (MAX 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('Image size must be less than 2MB. Please choose a smaller image.');
        event.target.value = '';
        return;
    }
    
    // CHECK FILE TYPE
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        tempImageData = e.target.result;
        // SHOW PREVIEW
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.src = tempImageData;
            preview.style.display = 'block';
        }
        const placeholder = document.getElementById('imagePlaceholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);
}

// REMOVE IMAGE
function removeImage() {
    tempImageData = null;
    const preview = document.getElementById('imagePreview');
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
    const placeholder = document.getElementById('imagePlaceholder');
    if (placeholder) {
        placeholder.style.display = 'flex';
    }
    const fileInput = document.getElementById('petImageInput');
    if (fileInput) {
        fileInput.value = '';
    }
}

// ADD PET MODAL
function openAddPetModal() {
    isEditMode = false;
    currentPetId = null;
    tempImageData = null;
    
    const modal = document.getElementById('petFormModal');
    const content = document.getElementById('petFormContent');
    
    content.innerHTML = `
        <div class="edit-header">
            <div class="edit-avatar" style="background:linear-gradient(135deg,#FDF3E7,#F5E6D3);">
                <i class="fa-solid fa-paw" style="font-size:28px; color:#5A361A;"></i>
            </div>
            <div class="edit-title">
                <h3>Add New Pet</h3>
                <span>Create a new pet profile</span>
            </div>
        </div>
        
        <form id="petForm" onsubmit="savePet(event)">
            <!-- PET IMAGE UPLOAD -->
            <div style="margin-bottom: 20px;">
                <div style="font-size:13px; font-weight:600; color:#5A361A; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                    <i class="fa-regular fa-image" style="color:#D97706;"></i> Pet Photo
                </div>
                <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
                    <div style="position:relative; width:100px; height:100px; border-radius:12px; border:2px dashed #D3C4B8; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#FAF8F5; flex-shrink:0;">
                        <img id="imagePreview" style="width:100%; height:100%; object-fit:cover; display:none;" alt="Pet preview">
                        <div id="imagePlaceholder" style="display:flex; flex-direction:column; align-items:center; color:#B0A090; font-size:11px;">
                            <i class="fa-regular fa-camera" style="font-size:28px; margin-bottom:4px;"></i>
                            <span>No image</span>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <label for="petImageInput" style="cursor:pointer;">
                            <div class="btn btn-secondary" style="padding:8px 20px; font-size:12px; margin:0;">
                                <i class="fa-regular fa-upload"></i> Choose Image
                            </div>
                            <input type="file" id="petImageInput" accept="image/*" style="display:none;" onchange="handleImageUpload(event)">
                        </label>
                        <button type="button" class="btn btn-secondary" style="padding:8px 20px; font-size:12px; background:#FCE8E6; color:#C5221F; border-color:#FCE8E6;" onclick="removeImage()">
                            <i class="fa-regular fa-trash-can"></i> Remove
                        </button>
                        <small style="color:#8A7A6A; font-size:10px;">Max 2MB (JPG, PNG, GIF)</small>
                    </div>
                </div>
            </div>

            <!-- PET INFORMATION SECTION -->
            <div style="margin-bottom: 20px;">
                <div style="font-size:13px; font-weight:600; color:#5A361A; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-paw" style="color:#D97706;"></i> Pet Information
                </div>
                <div class="edit-form">
                    <div class="field full-width">
                        <label>Pet Name <span class="required">*</span></label>
                        <input type="text" id="petName" placeholder="Enter pet name" required>
                    </div>
                    <div class="field">
                        <label>Species <span class="required">*</span></label>
                        <select id="petSpecies" required>
                            <option value="Dog">Dog</option>
                            <option value="Cat">Cat</option>
                        </select>
                    </div>
                    <div class="field">
                        <label>Breed <span class="required">*</span></label>
                        <input type="text" id="petBreed" placeholder="e.g. Golden Retriever" required>
                    </div>
                    <div class="field">
                        <label>Age (number) <span class="required">*</span></label>
                        <input type="number" id="petAge" placeholder="e.g. 3" min="0" step="0.5" required>
                        <small style="color:#8A7A6A; font-size:10px; margin-top:4px;">Auto format: 3 → 3 Years</small>
                    </div>
                    <div class="field">
                        <label>Weight (number) <span class="required">*</span></label>
                        <input type="number" id="petWeight" placeholder="e.g. 25" min="0" step="0.1" required>
                        <small style="color:#8A7A6A; font-size:10px; margin-top:4px;">Auto format: 25 → 25 kg</small>
                    </div>
                    <div class="field">
                        <label>Gender</label>
                        <select id="petGender">
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                    <div class="field full-width">
                        <label>Medical Notes</label>
                        <textarea id="petMedicalNotes" rows="2" placeholder="Any medical notes... (optional)"></textarea>
                    </div>
                    <div class="field">
                        <label>Status</label>
                        <select id="petStatus">
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- OWNER INFORMATION SECTION -->
            <div style="margin-bottom: 8px;">
                <div style="font-size:13px; font-weight:600; color:#5A361A; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                    <i class="fa-regular fa-user" style="color:#D97706;"></i> Owner Information
                </div>
                <div class="edit-form">
                    <div class="field full-width">
                        <label>Select Existing Owner <span class="required">*</span></label>
                        <select id="petOwnerId" required onchange="autoFillOwnerDetails()">
                            <option value="">-- Select Existing Customer --</option>
                            ${getCustomerOptions(null)}
                        </select>
                    </div>
                    <div class="field full-width" style="margin-top:8px;">
                        <label>Owner Name <span class="required">*</span></label>
                        <input type="text" id="petOwnerName" placeholder="Owner name will auto fill" required readonly>
                    </div>
                    <div class="field">
                        <label>Owner Phone</label>
                        <input type="text" id="petOwnerPhone" placeholder="Auto fill from customer" readonly>
                    </div>
                    <div class="field full-width">
                        <label>Owner Email</label>
                        <input type="email" id="petOwnerEmail" placeholder="Auto fill from customer" readonly>
                    </div>
                </div>
            </div>
            
            <div class="edit-actions">
                <button type="button" class="btn btn-secondary" onclick="closePetFormModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fa-regular fa-floppy-disk"></i> Add Pet
                </button>
            </div>
        </form>
    `;
    
    // RESET IMAGE PREVIEW
    setTimeout(() => {
        const preview = document.getElementById('imagePreview');
        const placeholder = document.getElementById('imagePlaceholder');
        if (preview) preview.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
    }, 100);
    
    modal.classList.add('active');
    lockBodyScroll();
}

// EDIT PET MODAL
function openEditPetModal(id) {
    const pet = petsData.find(p => p.id === id);
    
    if (!pet) {
        alert('PET NOT FOUND!');
        return;
    }
    
    isEditMode = true;
    currentPetId = id;
    tempImageData = pet.image || null;
    
    const modal = document.getElementById('petFormModal');
    const content = document.getElementById('petFormContent');
    
    const ageNum = pet.age.replace(' Years', '').replace(' Year', '').trim();
    const weightNum = pet.weight.replace(' kg', '').trim();
    
    const hasImage = pet.image && pet.image.length > 0;
    
    content.innerHTML = `
        <div class="edit-header">
            <div class="edit-avatar" style="background:linear-gradient(135deg,#FDF3E7,#F5E6D3);">
                <i class="fa-solid fa-paw" style="font-size:28px; color:#5A361A;"></i>
            </div>
            <div class="edit-title">
                <h3>Edit Pet</h3>
                <span>${pet.id}</span>
            </div>
        </div>
        
        <form id="petForm" onsubmit="savePet(event)">
            <!-- PET IMAGE UPLOAD -->
            <div style="margin-bottom: 20px;">
                <div style="font-size:13px; font-weight:600; color:#5A361A; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                    <i class="fa-regular fa-image" style="color:#D97706;"></i> Pet Photo
                </div>
                <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
                    <div style="position:relative; width:100px; height:100px; border-radius:12px; border:2px solid #D3C4B8; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#FAF8F5; flex-shrink:0;">
                        <img id="imagePreview" src="${hasImage ? pet.image : ''}" style="width:100%; height:100%; object-fit:cover; display:${hasImage ? 'block' : 'none'};" alt="Pet preview">
                        <div id="imagePlaceholder" style="display:${hasImage ? 'none' : 'flex'}; flex-direction:column; align-items:center; color:#B0A090; font-size:11px;">
                            <i class="fa-regular fa-camera" style="font-size:28px; margin-bottom:4px;"></i>
                            <span>No image</span>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <label for="petImageInput" style="cursor:pointer;">
                            <div class="btn btn-secondary" style="padding:8px 20px; font-size:12px; margin:0;">
                                <i class="fa-regular fa-upload"></i> Change Image
                            </div>
                            <input type="file" id="petImageInput" accept="image/*" style="display:none;" onchange="handleImageUpload(event)">
                        </label>
                        <button type="button" class="btn btn-secondary" style="padding:8px 20px; font-size:12px; background:#FCE8E6; color:#C5221F; border-color:#FCE8E6;" onclick="removeImage()">
                            <i class="fa-regular fa-trash-can"></i> Remove
                        </button>
                        <small style="color:#8A7A6A; font-size:10px;">Max 2MB (JPG, PNG, GIF)</small>
                    </div>
                </div>
            </div>

            <!-- PET INFORMATION SECTION -->
            <div style="margin-bottom: 20px;">
                <div style="font-size:13px; font-weight:600; color:#5A361A; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-paw" style="color:#D97706;"></i> Pet Information
                </div>
                <div class="edit-form">
                    <div class="field full-width">
                        <label>Pet Name <span class="required">*</span></label>
                        <input type="text" id="petName" value="${pet.name}" required>
                    </div>
                    <div class="field">
                        <label>Species <span class="required">*</span></label>
                        <select id="petSpecies" required>
                            <option value="Dog" ${pet.species === 'Dog' ? 'selected' : ''}>Dog</option>
                            <option value="Cat" ${pet.species === 'Cat' ? 'selected' : ''}>Cat</option>
                        </select>
                    </div>
                    <div class="field">
                        <label>Breed <span class="required">*</span></label>
                        <input type="text" id="petBreed" value="${pet.breed}" required>
                    </div>
                    <div class="field">
                        <label>Age (number) <span class="required">*</span></label>
                        <input type="number" id="petAge" value="${ageNum}" min="0" step="0.5" required>
                        <small style="color:#8A7A6A; font-size:10px; margin-top:4px;">Auto format: 3 → 3 Years</small>
                    </div>
                    <div class="field">
                        <label>Weight (number) <span class="required">*</span></label>
                        <input type="number" id="petWeight" value="${weightNum}" min="0" step="0.1" required>
                        <small style="color:#8A7A6A; font-size:10px; margin-top:4px;">Auto format: 25 → 25 kg</small>
                    </div>
                    <div class="field">
                        <label>Gender</label>
                        <select id="petGender">
                            <option value="Male" ${pet.gender === 'Male' ? 'selected' : ''}>Male</option>
                            <option value="Female" ${pet.gender === 'Female' ? 'selected' : ''}>Female</option>
                        </select>
                    </div>
                    <div class="field full-width">
                        <label>Medical Notes</label>
                        <textarea id="petMedicalNotes" rows="2" placeholder="Any medical notes... (optional)">${pet.medicalNotes || ''}</textarea>
                    </div>
                    <div class="field">
                        <label>Status</label>
                        <select id="petStatus">
                            <option value="Active" ${pet.status === 'Active' ? 'selected' : ''}>Active</option>
                            <option value="Inactive" ${pet.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- OWNER INFORMATION SECTION -->
            <div style="margin-bottom: 8px;">
                <div style="font-size:13px; font-weight:600; color:#5A361A; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                    <i class="fa-regular fa-user" style="color:#D97706;"></i> Owner Information
                </div>
                <div class="edit-form">
                    <div class="field full-width">
                        <label>Select Existing Owner <span class="required">*</span></label>
                        <select id="petOwnerId" required onchange="autoFillOwnerDetails()">
                            <option value="">-- Select Existing Customer --</option>
                            ${getCustomerOptions(pet.ownerId)}
                        </select>
                    </div>
                    <div class="field full-width" style="margin-top:8px;">
                        <label>Owner Name <span class="required">*</span></label>
                        <input type="text" id="petOwnerName" value="${pet.owner}" required readonly>
                    </div>
                    <div class="field">
                        <label>Owner Phone</label>
                        <input type="text" id="petOwnerPhone" value="${pet.ownerPhone || ''}" readonly>
                    </div>
                    <div class="field full-width">
                        <label>Owner Email</label>
                        <input type="email" id="petOwnerEmail" value="${pet.ownerEmail || ''}" readonly>
                    </div>
                </div>
            </div>
            
            <div class="edit-actions">
                <button type="button" class="btn btn-secondary" onclick="closePetFormModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fa-regular fa-floppy-disk"></i> Update Pet
                </button>
            </div>
        </form>
    `;
    
    modal.classList.add('active');
    lockBodyScroll();
}

// AUTO FILL OWNER DETAILS
function autoFillOwnerDetails() {
    const select = document.getElementById('petOwnerId');
    const customerId = select.value;
    
    if (customerId) {
        const customer = getCustomerById(customerId);
        if (customer) {
            document.getElementById('petOwnerName').value = customer.name;
            document.getElementById('petOwnerPhone').value = customer.phone || '';
            document.getElementById('petOwnerEmail').value = customer.email || '';
        }
    } else {
        document.getElementById('petOwnerName').value = '';
        document.getElementById('petOwnerPhone').value = '';
        document.getElementById('petOwnerEmail').value = '';
    }
}

function closePetFormModal() {
    const modal = document.getElementById('petFormModal');
    modal.classList.remove('active');
    unlockBodyScroll();
    currentPetId = null;
    isEditMode = false;
    tempImageData = null;
}

// SAVE PET
function savePet(event) {
    event.preventDefault();
    
    const name = document.getElementById('petName').value.trim();
    const species = document.getElementById('petSpecies').value;
    const breed = document.getElementById('petBreed').value.trim();
    const ageInput = document.getElementById('petAge').value.trim();
    const weightInput = document.getElementById('petWeight').value.trim();
    const gender = document.getElementById('petGender').value;
    const medicalNotes = document.getElementById('petMedicalNotes').value.trim();
    const status = document.getElementById('petStatus').value;
    const ownerId = document.getElementById('petOwnerId').value;
    const ownerName = document.getElementById('petOwnerName').value.trim();
    const ownerPhone = document.getElementById('petOwnerPhone').value.trim();
    const ownerEmail = document.getElementById('petOwnerEmail').value.trim();
    
    if (!name) {
        alert('Please enter pet name.');
        document.getElementById('petName').focus();
        return;
    }
    if (!ownerId) {
        alert('Please select an existing owner.');
        document.getElementById('petOwnerId').focus();
        return;
    }
    if (!ownerName) {
        alert('Owner name is required. Please select a valid customer.');
        document.getElementById('petOwnerId').focus();
        return;
    }
    if (!breed) {
        alert('Please enter breed.');
        document.getElementById('petBreed').focus();
        return;
    }
    if (!ageInput || isNaN(ageInput) || parseFloat(ageInput) < 0) {
        alert('Please enter a valid age (number).');
        document.getElementById('petAge').focus();
        return;
    }
    if (!weightInput || isNaN(weightInput) || parseFloat(weightInput) <= 0) {
        alert('Please enter a valid weight (number).');
        document.getElementById('petWeight').focus();
        return;
    }
    
    const age = formatAge(ageInput);
    const weight = formatWeight(weightInput);
    
    // GET IMAGE DATA
    const imageData = tempImageData || '';
    
    if (isEditMode && currentPetId) {
        const pet = petsData.find(p => p.id === currentPetId);
        
        if (pet) {
            pet.name = name;
            pet.ownerId = ownerId;
            pet.owner = ownerName;
            pet.species = species;
            pet.breed = breed;
            pet.age = age;
            pet.weight = weight;
            pet.gender = gender;
            pet.medicalNotes = medicalNotes || 'No medical notes.';
            pet.status = status;
            pet.ownerPhone = ownerPhone || 'N/A';
            pet.ownerEmail = ownerEmail || 'N/A';
            pet.image = imageData;
        }
        
        closePetFormModal();
        showSuccessModal('Pet Updated Successfully!', `Pet ${name} (${currentPetId}) has been updated successfully.`);
        
    } else {
        const newId = '#PET-' + String(petsData.length + 1).padStart(4, '0');
        
        const newPet = {
            id: newId,
            name: name,
            ownerId: ownerId,
            owner: ownerName,
            species: species,
            breed: breed,
            age: age,
            weight: weight,
            status: status,
            gender: gender,
            medicalNotes: medicalNotes || 'No medical notes.',
            lastService: 'None scheduled',
            totalBookings: 0,
            ownerPhone: ownerPhone || 'N/A',
            ownerEmail: ownerEmail || 'N/A',
            image: imageData
        };
        
        petsData.push(newPet);
        
        closePetFormModal();
        showSuccessModal('Pet Added Successfully!', `Pet ${name} (${newId}) has been added successfully.`);
    }
}

// DELETE PET
function openDeleteModal(id) {
    const pet = petsData.find(p => p.id === id);
    
    if (!pet) {
        alert('PET NOT FOUND!');
        return;
    }
    
    currentPetId = id;
    const modal = document.getElementById('deleteConfirmModal');
    const message = document.getElementById('deleteConfirmMessage');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    message.innerHTML = `Are you sure you want to delete pet <strong>${pet.name}</strong> (${pet.id})? This action cannot be undone.`;
    
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.addEventListener('click', function() {
        confirmDeletePet();
    });
    
    modal.classList.add('active');
    lockBodyScroll();
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    modal.classList.remove('active');
    unlockBodyScroll();
    currentPetId = null;
}

function confirmDeletePet() {
    const id = currentPetId;
    
    if (!id) {
        alert('No pet selected for deletion.');
        return;
    }
    
    const index = petsData.findIndex(p => p.id === id);
    
    if (index === -1) {
        alert('Pet not found!');
        return;
    }
    
    const petName = petsData[index].name;
    
    petsData.splice(index, 1);
    
    closeDeleteModal();
    showSuccessModal('Pet Deleted Successfully!', `Pet ${petName} (${id}) has been deleted successfully.`);
}

// SUCCESS MODAL
function showSuccessModal(title, message) {
    const modal = document.getElementById('successModal');
    const titleEl = document.getElementById('successTitle');
    const messageEl = document.getElementById('successMessage');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    modal.classList.add('active');
    lockBodyScroll();
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.remove('active');
    unlockBodyScroll();
    
    applyFiltersAndRender();
    loadPetStats();
}

// SEARCH AND FILTER
function applyFiltersAndRender() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
    const speciesFilter = document.getElementById('speciesFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    const filtered = petsData.filter(pet => {
        const matchesSearch = pet.name.toLowerCase().includes(searchQuery) ||
                              pet.owner.toLowerCase().includes(searchQuery) ||
                              pet.breed.toLowerCase().includes(searchQuery);
        
        const matchesSpecies = speciesFilter === 'all' || pet.species === speciesFilter;
        const matchesStatus = statusFilter === 'all' || pet.status === statusFilter;
        
        return matchesSearch && matchesSpecies && matchesStatus;
    });
    
    renderPetTable(filtered);
}

// LOAD PET STATS 
function loadPetStats() {
    const total = petsData.length;
    const dogs = petsData.filter(p => p.species === 'Dog').length;
    const cats = petsData.filter(p => p.species === 'Cat').length;
    
    const dogPercent = total > 0 ? ((dogs / total) * 100).toFixed(1) : 0;
    const catPercent = total > 0 ? ((cats / total) * 100).toFixed(1) : 0;
    
    document.getElementById('totalPets').textContent = total;
    document.getElementById('totalDogs').textContent = dogs;
    document.getElementById('totalCats').textContent = cats;
    
    document.getElementById('dogPercentage').textContent = `${dogPercent}% of total`;
    document.getElementById('catPercentage').textContent = `${catPercent}% of total`;
}

// DOM READY
document.addEventListener('DOMContentLoaded', function() {

    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');
    const overlay = document.getElementById('sidebarOverlay');

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (menuToggle) menuToggle.addEventListener('click', openSidebar);
    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSidebar();
            closeLogoutModal();
            closePetDetail();
            closePetFormModal();
            closeDeleteModal();
            closeSuccessModal();
        }
    });

    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            alert('NO NEW NOTIFICATIONS.');
        });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            applyFiltersAndRender();
        });
    }

    const speciesFilter = document.getElementById('speciesFilter');
    if (speciesFilter) {
        speciesFilter.addEventListener('change', function() {
            applyFiltersAndRender();
        });
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            applyFiltersAndRender();
        });
    }

    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                unlockBodyScroll();
                if (this.id === 'successModal') {
                    applyFiltersAndRender();
                    loadPetStats();
                }
            }
        });
    });

    loadPetStats();
    renderPetTable(petsData);

    console.log('PAWCARE ADMIN PETS LOADED SUCCESSFULLY!');
});