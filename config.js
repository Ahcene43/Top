// config.js - ملف الإعدادات المشترك
let STORE_CONFIG = {};

// دالة لتحميل الإعدادات من GitHub
async function loadRemoteConfig() {
  return new Promise(async (resolve) => {
    try {
      // المحاولة الأولى: من المستودع المحدد في الإعدادات
      const stores = JSON.parse(localStorage.getItem('stores') || '{}');
      const currentStore = localStorage.getItem('currentStore');
      let configUrl = 'https://raw.githubusercontent.com/ahcene43/WAW/main/config.json';
      
      if (currentStore && stores[currentStore] && stores[currentStore].github) {
        const githubConfig = stores[currentStore].github;
        if (githubConfig.username && githubConfig.repo) {
          configUrl = `https://raw.githubusercontent.com/${githubConfig.username}/${githubConfig.repo}/${githubConfig.branch || 'main'}/config.json`;
        }
      }
      
      const response = await fetch(configUrl + '?t=' + Date.now());
      
      if (response.ok) {
        const remoteConfig = await response.json();
        STORE_CONFIG = remoteConfig;
        console.log('✅ Paramètres chargés depuis: ' + configUrl);
        resolve(true);
      } else {
        console.log('❌ Échec du chargement depuis: ' + configUrl);
        resolve(false);
      }
    } catch (error) {
      console.log('⚠️ Erreur lors du chargement des paramètres:', error);
      resolve(false);
    }
  });
}

// تحميل الإعدادات المحفوظة محلياً (للنسخ الاحتياطي فقط)
function loadConfig() {
  // أولاً نحاول تحميل من الخادم
  loadRemoteConfig();
  
  // ثم نحمّل من localStorage كنسخة احتياطية
  const saved = localStorage.getItem('storeConfig');
  if (saved) {
    try {
      const parsedConfig = JSON.parse(saved);
      // ندمج فقط إذا كان الخادم فشل
      if (Object.keys(STORE_CONFIG).length === 0) {
        STORE_CONFIG = parsedConfig;
      }
    } catch (e) {
      console.error('Error loading local config:', e);
    }
  }
  
  // إذا لم توجد أي إعدادات، نستخدم الافتراضية
  if (Object.keys(STORE_CONFIG).length === 0) {
    STORE_CONFIG = getDefaultConfig();
  }
  
  return STORE_CONFIG;
}

// الإعدادات الافتراضية (للطوارئ فقط)
function getDefaultConfig() {
  return {
    PRODUCTS: {
      1: { 
        name: "مودال 1", 
        price: 3300, 
        image: "https://raw.githubusercontent.com/ahcene43/WAW/main/images/modal1.jpg", 
        description: "تصميم مريح وعصري مع تفاصيل راقية تناسب جميع المناسبات",
        availableSizes: ["S", "M", "L"],
        availableColors: ["كما في الصورة", "أبيض", "أسود", "أزرق"]
      }
    },
    DELIVERY_PRICES: {
      "00 - إختر الولاية": { home: 0, desk: 0 },
      "16 - الجزائر": { home: 500, desk: 250 }
    },
    DISCOUNTS: {
      minQuantityForDiscount: 2,
      discountPerItem: 300
    },
    STORE_INFO: {
      name: "BEN&KRAB-Shopp",
      tagline: "متجر أفخم الملابس للأطفال",
      phoneNumbers: ["0671466489", "0551102155"]
    },
    AGE_SIZES: {
      3: "S", 4: "S", 5: "S", 
      6: "M", 7: "M", 
      8: "L", 9: "L", 
      10: "XL", 11: "XL", 12: "XL"
    },
    AVAILABLE_COLORS: [
      "كما في الصورة", "أبيض", "أسود", "رمادي", "أزرق", 
      "أحمر", "أخضر", "زهري", "بنفسجي", "أصفر", "برتقالي", "ذهبي"
    ],
    AVAILABLE_SIZES: ["S", "M", "L", "XL", "XXL"]
  };
}

// حفظ الإعدادات محلياً
function saveConfig(config = STORE_CONFIG) {
  localStorage.setItem('storeConfig', JSON.stringify(config));
  
  if (typeof updateLiveStore === 'function') {
    updateLiveStore();
  }
}

// دالة للحفظ على GitHub (تُستدعى من الادمن)
async function saveToGitHub(config, githubConfig) {
  try {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(config, null, 2))));
    
    // محاولة الحصول على الـ SHA للملف الموجود
    let sha = '';
    try {
      const existingFile = await fetch(`https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}/contents/config.json`, {
        headers: {
          'Authorization': `token ${githubConfig.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (existingFile.ok) {
        const fileData = await existingFile.json();
        sha = fileData.sha;
      }
    } catch (error) {
      console.log('الملف غير موجود، سيتم إنشاؤه');
    }

    const response = await fetch(`https://api.github.com/repos/${githubConfig.username}/${githubConfig.repo}/contents/config.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubConfig.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: 'Mise à jour des paramètres du magasin - ' + new Date().toLocaleString('fr-FR'),
        content: content,
        sha: sha,
        branch: githubConfig.branch || 'main'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Échec de la sauvegarde des paramètres sur GitHub');
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la sauvegarde sur GitHub:', error);
    throw error;
  }
}

// دالة للحفظ مع التوكن
async function saveToGitHubWithToken(config, githubConfig) {
  return await saveToGitHub(config, githubConfig);
}

// دالة للتحميل مع التوكن
async function loadRemoteConfigWithToken(githubConfig) {
  return new Promise(async (resolve) => {
    try {
      const configUrl = `https://raw.githubusercontent.com/${githubConfig.username}/${githubConfig.repo}/${githubConfig.branch || 'main'}/config.json?t=${Date.now()}`;
      const response = await fetch(configUrl);
      
      if (response.ok) {
        const remoteConfig = await response.json();
        STORE_CONFIG = remoteConfig;
        console.log('✅ Paramètres chargés depuis le serveur');
        resolve(true);
      } else {
        console.log('❌ Échec du chargement des paramètres depuis le serveur');
        resolve(false);
      }
    } catch (error) {
      console.log('⚠️ Erreur lors du chargement des paramètres depuis le serveur', error);
      resolve(false);
    }
  });
}

// دالة لتصحيح روابط الصور
function validateGithubConfig() {
  const stores = JSON.parse(localStorage.getItem('stores') || '{}');
  const currentStore = localStorage.getItem('currentStore');
  
  if (currentStore && stores[currentStore]) {
    const config = stores[currentStore].config;
    const githubConfig = stores[currentStore].github;
    const currentImages = Object.values(config.PRODUCTS).map(p => p.image);
    
    // التحقق إذا كانت الصور من مستودع مختلف
    const wrongRepoImages = currentImages.filter(img => 
      img && githubConfig && githubConfig.username && githubConfig.repo && 
      !img.includes(`/${githubConfig.username}/${githubConfig.repo}/`)
    );
    
    if (wrongRepoImages.length > 0) {
      console.log(`⚠️ Attention: ${wrongRepoImages.length} images proviennent d'un dépôt différent`);
      return true;
    }
  }
  return false;
}

function correctImageLinks() {
  const stores = JSON.parse(localStorage.getItem('stores') || '{}');
  const currentStore = localStorage.getItem('currentStore');
  
  if (currentStore && stores[currentStore]) {
    const config = stores[currentStore].config;
    const githubConfig = stores[currentStore].github;
    
    if (githubConfig && githubConfig.username && githubConfig.repo) {
      Object.keys(config.PRODUCTS).forEach(productId => {
        const product = config.PRODUCTS[productId];
        if (product.image) {
          // استخراج اسم الملف من الرابط القديم
          const filename = product.image.split('/').pop();
          // إنشاء الرابط الجديد
          product.image = `https://raw.githubusercontent.com/${githubConfig.username}/${githubConfig.repo}/main/images/${filename}`;
        }
      });
      
      stores[currentStore].config = config;
      localStorage.setItem('stores', JSON.stringify(stores));
      console.log('✅ Liens d\'images corrigés avec succès');
      return true;
    }
  }
  return false;
}

// تحميل الإعدادات عند استيراد الملف
loadConfig();
