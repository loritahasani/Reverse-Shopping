// Test Firebase Storage access
import { initializeApp } from 'firebase/app';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyC6yRWf1Oo_PY-y0nX6l8qrIBAXWfdEfV0",
    authDomain: "reverseshooping.firebaseapp.com",
    projectId: "reverseshooping",
    storageBucket: "reverseshooping.appspot.com",
    messagingSenderId: "807045364369",
    appId: "1:807045364369:web:e44cd5cbd9e44bc2505d30",
    measurementId: "G-ZLS9XGZ28E"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function testFirebaseStorage() {
  try {
    console.log('Testing Firebase Storage access...');
    
    // Create a simple test blob
    const testData = 'Hello Firebase Storage!';
    const blob = new Blob([testData], { type: 'text/plain' });
    
    // Create a test file reference
    const fileName = `test_${Date.now()}.txt`;
    const storageRef = ref(storage, `test_files/${fileName}`);
    
    console.log('Uploading test file...');
    const uploadResult = await uploadBytes(storageRef, blob);
    console.log('Upload successful:', uploadResult);
    
    console.log('Getting download URL...');
    const downloadURL = await getDownloadURL(storageRef);
    console.log('Download URL:', downloadURL);
    
    console.log('Firebase Storage test completed successfully!');
  } catch (error) {
    console.error('Firebase Storage test failed:', error);
  }
}

testFirebaseStorage(); 