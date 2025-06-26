import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
    createUserWithEmailAndPassword,
    EmailAuthProvider,
    onAuthStateChanged,
    reauthenticateWithCredential,
    signInWithEmailAndPassword,
    signOut,
    updateEmail,
    updateProfile,
} from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ImageBackground,
    Modal,
    Platform,
    KeyboardAvoidingView as RNKeyboardAvoidingView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, storage } from './firebase';

const { width, height } = Dimensions.get('window');
const isMobile = width < 768;
const isTablet = width >= 768 && width < 1024;
const isDesktop = width >= 1024;

const ProfileScreen = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Profile editing states
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [bio, setBio] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [editProfileError, setEditProfileError] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [avatarOptions, setAvatarOptions] = useState([
    'https://ui-avatars.com/api/?name=A&background=007AFF&color=fff',
    'https://ui-avatars.com/api/?name=B&background=FF5722&color=fff',
    'https://ui-avatars.com/api/?name=C&background=4CAF50&color=fff',
    'https://ui-avatars.com/api/?name=D&background=9C27B0&color=fff',
    'https://ui-avatars.com/api/?name=E&background=FF9800&color=fff'
  ]);
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(-1);
  const [showPassword, setShowPassword] = useState(false);

  // Recipe creation state
  const [recipeModalVisible, setRecipeModalVisible] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState('');
  const [recipeInstructions, setRecipeInstructions] = useState('');
  const [recipeImage, setRecipeImage] = useState<string | null>(null);
  const [publishingRecipe, setPublishingRecipe] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setNewDisplayName(currentUser.displayName || '');
        setNewEmail(currentUser.email || '');

        // Load user bio from AsyncStorage if available
        loadUserProfile(currentUser.uid);
      }
      setLoading(false);
    });

    // Request permission for accessing the photo library
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Leje e nevojshme', 'Na duhet leje për të aksesuar galerinë tuaj për të ndryshuar foton e profilit.');
        }
      }
    })();

    return unsubscribe;
  }, []);

  const handleForgotPassword = () => {
    if (!email.trim()) {
      setErrorMessage('Ju lutem shkruani email-in tuaj për të rivendosur fjalëkalimin');
      return;
    }

    // Here you would implement password reset functionality
    // For now, just show a confirmation message
    Alert.alert(
      'Resetimi i fjalëkalimit',
      `Një link për resetimin e fjalëkalimit do të dërgohet tek ${email}.`,
      [{ text: 'OK' }]
    );
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      Alert.alert('Gabim', 'Ju lutem provoni përsëri.');
    }
  };

  // Load user profile data from AsyncStorage
  const loadUserProfile = async (userId: string) => {
    try {
      const userProfileData = await AsyncStorage.getItem(`@user_profile_${userId}`);
      if (userProfileData) {
        const profileData = JSON.parse(userProfileData);
        setBio(profileData.bio || '');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Save user profile data to AsyncStorage
  const saveUserProfile = async (userId: string, profileData: any) => {
    try {
      await AsyncStorage.setItem(`@user_profile_${userId}`, JSON.stringify(profileData));
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  };

  // Open recipe creation modal
  const openRecipeModal = () => {
    if (!user) {
      Alert.alert('Ju lutem kyçuni', 'Ju duhet të kyçeni për të publikuar receta.');
      return;
    }
    setRecipeName('');
    setRecipeIngredients('');
    setRecipeInstructions('');
    setRecipeImage(null);
    setRecipeModalVisible(true);
  };

  // Handle recipe image selection
  const pickRecipeImage = async () => {
    try {
      console.log('Requesting media library permissions...');
      // Request permission to access the media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        console.log('Permission denied for media library');
        Alert.alert(
          'Leje e nevojshme', 
          'Na duhet leje për të aksesuar galerinë e fotos për të shtuar foto në recetat tuaja. Ju mund të ndryshoni këtë në cilësimet e aplikacionit.',
          [
            { text: 'Anulo', style: 'cancel' },
            { text: 'Hap cilësimet', onPress: () => {
              // On web, we can't open settings, so just show instructions
              if (Platform.OS === 'web') {
                Alert.alert('Cilësimet', 'Ju lutem hapni cilësimet e shfletuesit dhe jepni leje për aksesin në galeri.');
              }
            }}
          ]
        );
        return;
      }

      console.log('Permission granted, launching image picker...');
      // Launch the image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });

      console.log('Image picker result:', result);
      // Check if an image was selected
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Set the selected image URI
        setRecipeImage(result.assets[0].uri);
        console.log('Image selected:', result.assets[0].uri);
      } else {
        console.log('No image selected or picker was canceled');
      }
    } catch (error) {
      console.error('Error picking recipe image:', error);
      Alert.alert('Gabim', 'Ndodhi një gabim gjatë zgjedhjes së fotos. Ju lutem provoni përsëri.');
    }
  };

  // Optimized recipe image upload to Firebase Storage
  const uploadRecipeImage = async (uri: string): Promise<string> => {
    try {
      console.log('Starting image upload process for URI:', uri);
      
      if (!user?.uid) {
        throw new Error('User ID not available');
      }

      // Create a unique filename for the image
      const fileExtension = uri.split('.').pop() || 'jpg';
      const fileName = `recipe_${user.uid}_${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, `recipe_images/${fileName}`);
      
      console.log('Created storage reference:', fileName);

      // Optimize image before upload if possible
      let optimizedUri = uri;
      try {
        console.log('Optimizing image...');
        // Use ImageManipulator to resize and compress the image for faster upload
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1200 } }], // Resize to reasonable dimensions
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // Compress to reduce size
        );
        optimizedUri = manipResult.uri;
        console.log('Image optimized successfully');
      } catch (manipError) {
        console.log('Image optimization skipped:', manipError);
        // Continue with original image if optimization fails
      }

      console.log('Creating blob from image...');
      // Create a blob from the image URI
      const response = await fetch(optimizedUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('Blob created, size:', blob.size);

      console.log('Uploading to Firebase Storage...');
      // Upload the blob to Firebase Storage
      const uploadResult = await uploadBytes(storageRef, blob, {
        contentType: `image/${fileExtension}`
      });

      if (!uploadResult) {
        throw new Error('Upload failed - no result returned');
      }

      console.log('Upload successful, getting download URL...');
      // Get the download URL for the uploaded image
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL obtained:', downloadURL);
      
      return downloadURL || '';
    } catch (error) {
      console.error('Error uploading recipe image:', error);
      throw error;
    }
  };

  // Handle recipe submission with optimized performance
  const handlePublishRecipe = async () => {
    try {
      console.log('handlePublishRecipe called');
      console.log('Recipe data:', { recipeName, recipeIngredients, recipeInstructions, recipeImage });
      
      console.log('Validating recipe data...');
      console.log('recipeName.trim():', recipeName.trim());
      console.log('recipeIngredients.trim():', recipeIngredients.trim());
      console.log('recipeInstructions.trim():', recipeInstructions.trim());
      console.log('recipeName.trim().length:', recipeName.trim().length);
      console.log('recipeIngredients.trim().length:', recipeIngredients.trim().length);
      console.log('recipeInstructions.trim().length:', recipeInstructions.trim().length);
      
      if (!recipeName.trim() || !recipeIngredients.trim() || !recipeInstructions.trim()) {
        console.log('Validation failed - missing required fields');
        Alert.alert('Gabim', 'Ju lutem plotësoni të gjitha fushat e detyrueshme.');
        return;
      }

      console.log('Validation passed, checking user...');
      if (!user) {
        console.log('No user found');
        Alert.alert('Gabim', 'Ju duhet të jeni të kyçur për të publikuar receta.');
        return;
      }

      console.log('User found:', user.uid);
      setPublishingRecipe(true);
      console.log('Starting recipe publishing process...');

      const ingredientsArray = recipeIngredients
        .split('\n')
        .map(item => item.trim())
        .filter(item => item.length > 0);

      if (ingredientsArray.length === 0) {
        Alert.alert('Gabim', 'Ju lutem shtoni të paktën një përbërës.');
        setPublishingRecipe(false);
        return;
      }

      const recipeData = {
        name: recipeName.trim(),
        perberesit: ingredientsArray,
        instructions: recipeInstructions.trim(),
        userId: user.uid,
        createdAt: new Date().toISOString()
      };

      console.log('Recipe data prepared:', recipeData);

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      let imageUploadPromise = null;
      if (recipeImage) {
        console.log('Recipe image found, preparing upload...');
        imageUploadPromise = (async () => {
          try {
            console.log('Starting image processing and upload');
            // Use the uploadRecipeImage function to actually upload to Firebase
            const imageUrl = await uploadRecipeImage(recipeImage);
            console.log('Image uploaded successfully:', imageUrl);
            return imageUrl;
          } catch (error) {
            console.error('Error processing or uploading image:', error);
            console.log('Continuing recipe save without image');
            // Show a warning but don't stop the recipe save process
            Alert.alert(
              'Vërejtje',
              'Fotoja nuk u ngarkua, por receta do të ruhet pa foto.',
              [{ text: 'Në rregull', style: 'default' }]
            );
            return null; // Continue without image if upload fails
          }
        })();
      } else {
        console.log('No recipe image selected');
      }

      const getApiBaseUrl = () => {
        return 'https://reverse-shopping-hiq9.onrender.com';
      };

      const apiUrl = `${getApiBaseUrl()}/recipes`;

      console.log('Sending recipe data to API:', JSON.stringify(recipeData));
      console.log('API URL:', apiUrl);

      console.log('Proceeding to save recipe (skipping API connection test)');

      let isOfflineMode = false;

      console.log('Starting API post and image upload in parallel');
      
      // First, wait for image upload to complete (if there is an image)
      let uploadedImageUrl = null;
      if (imageUploadPromise) {
        console.log('Waiting for image upload to complete...');
        try {
          uploadedImageUrl = await imageUploadPromise;
          console.log('Image upload completed successfully:', uploadedImageUrl);
        } catch (error) {
          console.log('Image upload failed, continuing without image:', error);
          uploadedImageUrl = null;
        }
      } else {
        console.log('No image to upload, proceeding without image');
      }

      console.log('About to create recipe with image URL:', uploadedImageUrl);

      // Now create the recipe with the image URL
      const results = await Promise.allSettled([
        axios.post(apiUrl, {
          ...recipeData,
          image: uploadedImageUrl, // Include image URL in the initial POST request
        }, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        }).catch(error => {
          console.log('API post failed, marking as offline mode:', error.message);
          isOfflineMode = true;
          return Promise.reject({
            isOfflineError: true,
            originalError: error
          });
        })
      ]);

      console.log('API request completed, processing results...');
      const apiResponse = results[0];

      if (apiResponse.status === 'fulfilled') {
        console.log('API Response Status:', apiResponse.value.status);
        console.log('API Response Data:', JSON.stringify(apiResponse.value.data));
      } else {
        console.error('API Request rejected:', apiResponse.reason);
        if (apiResponse.reason?.isOfflineError) {
          console.log('Continuing in offline mode');
        }
      }

      console.log('Image upload result:', JSON.stringify(uploadedImageUrl));
      console.log('API response:', JSON.stringify(apiResponse));

      if ((apiResponse.status === 'fulfilled' &&
        (apiResponse.value?.status === 201 || apiResponse.value?.status === 200)) || isOfflineMode) {

        let serverRecipe: any;

        if (apiResponse.status === 'fulfilled' && apiResponse.value?.data) {
          serverRecipe = {
            ...apiResponse.value.data,
            image: uploadedImageUrl
          };
          console.log('Server recipe received:', JSON.stringify(serverRecipe));
        } else {
          serverRecipe = {
            ...recipeData,
            image: uploadedImageUrl,
            id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            offlineCreated: true,
            pendingSync: true
          };
          console.log('Created offline recipe:', JSON.stringify(serverRecipe));
        }

        if (serverRecipe && serverRecipe._id && !serverRecipe.id) {
          serverRecipe.id = serverRecipe._id;
          console.log('Using MongoDB _id as id:', serverRecipe.id);
        } else if (serverRecipe && !serverRecipe.id && !serverRecipe._id) {
          serverRecipe.id = `server_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          console.warn('Server did not return an ID, generated:', serverRecipe.id);
        } else if (!serverRecipe) {
          throw new Error('Server returned empty recipe data');
        }

        if (uploadedImageUrl) {
          console.log('Image upload succeeded, updating recipe with URL:', uploadedImageUrl);
          try {
            const recipeId = serverRecipe.id || serverRecipe._id;
            console.log(`Updating recipe ${recipeId} with image URL:`, uploadedImageUrl);
            const patchResponse = await axios.patch(`${apiUrl}/${recipeId}`, {
              image: uploadedImageUrl
            });
            console.log('Image PATCH response:', JSON.stringify(patchResponse.data));
            serverRecipe.image = uploadedImageUrl;
          } catch (error) {
            console.error('Error updating recipe with image URL:', error);
            // Don't fail the entire process if image update fails
            console.log('Continuing without image update');
          }
        } else if (uploadedImageUrl === null) {
          console.log('Image upload failed, but recipe will be saved without image');
          // Recipe will be saved without image, which is fine
        }

        try {
          const storedRecipes = await AsyncStorage.getItem('userRecipes');
          let recipes = [];

          if (storedRecipes) {
            recipes = JSON.parse(storedRecipes);
            console.log(`Found ${recipes.length} existing recipes in AsyncStorage`);
            console.log(`Looking to replace temp recipe with ID: ${tempId}`);

            let found = false;
            recipes = recipes.map((recipe: any) => {
              if (recipe.id === tempId) {
                found = true;
                console.log('Found and replacing temp recipe with server recipe');
                return serverRecipe;
              }
              return recipe;
            });

            if (!found) {
              console.log('Temp recipe not found, adding server recipe to beginning');
              recipes.unshift(serverRecipe);
            }
          } else {
            console.log('No existing recipes, creating new array with server recipe');
            recipes = [serverRecipe];
          }

          await AsyncStorage.setItem('userRecipes', JSON.stringify(recipes));
          console.log(`Saved ${recipes.length} recipes to AsyncStorage`);

          const timestamp = new Date().toISOString();
          await AsyncStorage.setItem('recipes_last_updated', timestamp);
          await AsyncStorage.setItem('recipes_last_checked_timestamp', timestamp);
          console.log('Updated timestamps:', timestamp);

          if (user?.uid) {
            await AsyncStorage.setItem(`recipes_last_updated_${user.uid}`, timestamp);
          }

          await AsyncStorage.removeItem('force_refresh_recipes');
          await AsyncStorage.setItem('force_refresh_recipes', 'true');
          console.log('Force refresh flag set to true');

          const checkFlag = await AsyncStorage.getItem('force_refresh_recipes');
          console.log('Verified force_refresh_recipes flag is:', checkFlag);

          const imageStatus = uploadedImageUrl ? 'me foto' : 'pa foto';

          Alert.alert(
            '🎉 Receta u Postua me Sukses!',
            `Receta juaj "${recipeName.trim()}" u ruajt me sukses ${imageStatus} dhe tani është e disponueshme në profilin tuaj.\n\nJu mund ta gjeni në seksionin "Recetat e mia".`,
            [
              { 
                text: 'Shiko Recetat e Mia', 
                style: 'default',
                onPress: () => {
                  // Close the modal first
                  setRecipeModalVisible(false);
                  // Navigate to my recipes after a short delay
                  setTimeout(() => {
                    router.push('/my-recipes');
                  }, 300);
                }
              },
              { text: 'Mbyll', style: 'cancel' }
            ]
          );

          setRecipeName('');
          setRecipeIngredients('');
          setRecipeInstructions('');
          setRecipeImage(null);

        } catch (error) {
          console.error('Error updating local storage:', error);
          Alert.alert('Gabim', 'Nuk mund të ruajmë recetat në ruajtjen lokale.');
        }
      }
    } catch (error: any) {
      console.error('Error saving recipe:', error);

      let errorMessage = 'Ndodhi një gabim gjatë ruajtjes së recetës. Ju lutemi provoni përsëri.';

      if (error.response?.status === 413) {
        errorMessage = 'Imazhi është shumë i madh. Ju lutemi përdorni një imazh më të vogël.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Ju duhet të jeni të kyçur për të ruajtur receta.';
      }

      Alert.alert(
        'Gabim në ruajtjen e recetës',
        `${errorMessage}\n\nDetaje teknike: ${error.message || 'Gabim i panjohur'}`
      );

      const errorStr = typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error);
      console.log('Error string representation:', errorStr);

      const isNetworkError =
        errorStr.includes('Network Error') ||
        errorStr.includes('ECONNREFUSED') ||
        errorStr.includes('timeout');

      if (isNetworkError) {
        errorMessage = 'Nuk mund të lidhemi me serverin. Ju lutemi kontrolloni lidhjen tuaj të internetit.';

        try {
          console.log('Attempting to save recipe locally despite network error');

          const ingredientsArray = recipeIngredients
            .split('\n')
            .map(item => item.trim())
            .filter(item => item.length > 0);

          const localRecipeData = {
            name: recipeName.trim(),
            perberesit: ingredientsArray,
            instructions: recipeInstructions.trim(),
            image: null,
            userId: user?.uid || 'anonymous',
            createdAt: new Date().toISOString(),
          };

          const offlineRecipe = {
            ...localRecipeData,
            id: `offline_${Date.now()}`,
            offlineCreated: true,
            pendingSync: true,
            image: null
          };

          const storedRecipes = await AsyncStorage.getItem('userRecipes');
          let recipes = [];

          if (storedRecipes) {
            recipes = JSON.parse(storedRecipes);
          }

          recipes.unshift(offlineRecipe);
          await AsyncStorage.setItem('userRecipes', JSON.stringify(recipes));

          await AsyncStorage.setItem('force_refresh_recipes', 'true');
          console.log('Saved recipe locally despite network error');

          errorMessage += ' Receta është ruajtur lokalisht dhe do të sinkronizohet kur lidhja të jetë e disponueshme.';
        } catch (storageError) {
          console.error('Failed to save recipe locally:', storageError);
        }
      }

      Alert.alert(
        'Gabim gjatë ruajtjes',
        errorMessage + ' Dëshironi të provoni përsëri?',
        [
          {
            text: 'Jo',
            style: 'cancel',
            onPress: () => {
              setRecipeName('');
              setRecipeIngredients('');
              setRecipeInstructions('');
              setRecipeImage(null);
            }
          },
          {
            text: 'Po',
            onPress: () => setRecipeModalVisible(true)
          }
        ]
      );
    } finally {
      setPublishingRecipe(false);
    }
  };

  const openEditProfileModal = () => {
    if (user) {
      setNewDisplayName(user.displayName || '');
      setNewEmail(user.email || '');
      setSelectedAvatarIndex(-1);
      setCurrentPassword('');
      setEditProfileError('');
      setUploadedImage(null);
      setEditProfileModalVisible(true);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Leje e mohuar', 'Na duhet leje për të aksesuar galerinë e fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadedImage(result.assets[0].uri);
        setSelectedAvatarIndex(-1);
        Alert.alert(
          'Foto e zgjedhur',
          'Klikoni Ruaj për të përditësuar foton e profilit.'
        );
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Gabim', 'Ndodhi një gabim gjatë zgjedhjes së fotos.');
    }
  };

  const uploadImageToFirebase = async (uri: string): Promise<string> => {
    try {
      console.log('Firebase upload bypassed for development - using placeholder image');
      return 'https://via.placeholder.com/300x200?text=Profile+Image+Placeholder';
    } catch (error) {
      console.error('Error with image handling:', error);
      return 'https://via.placeholder.com/300x200?text=Profile+Image+Error';
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) {
      Alert.alert('Gabim', 'Ju nuk jeni të identifikuar.');
      return;
    }

    setUpdatingProfile(true);
    setEditProfileError('');

    try {
      if (uploadedImage) {
        try {
          Alert.alert('Duke ngarkuar', 'Ju lutem prisni ndërsa fotoja juaj ngarkohet...');
          const photoURL = await uploadImageToFirebase(uploadedImage);
          await updateProfile(user, { photoURL });
          await user.reload();
        } catch (uploadError) {
          console.error('Failed to upload image:', uploadError);
          setEditProfileError('Ndodhi një gabim gjatë ngarkimit të fotos. Ju lutem provoni përsëri.');
          setUpdatingProfile(false);
          return;
        }
      }

      if (selectedAvatarIndex >= 0) {
        const avatarURL = avatarOptions[selectedAvatarIndex];
        await updateProfile(user, { photoURL: avatarURL });
      }

      if (newDisplayName !== user.displayName) {
        await updateProfile(user, { displayName: newDisplayName });
      }

      if (newEmail !== user.email && currentPassword) {
        try {
          const credential = EmailAuthProvider.credential(
            user.email || '',
            currentPassword
          );

          await reauthenticateWithCredential(user, credential);
          await updateEmail(user, newEmail);
        } catch (emailError: any) {
          if (emailError.code === 'auth/wrong-password' || emailError.code === 'auth/user-mismatch') {
            setEditProfileError('Fjalëkalimi aktual është i gabuar.');
          } else if (emailError.code === 'auth/requires-recent-login') {
            setEditProfileError('Ju duhet të dilni dhe të hyni përsëri për të ndryshuar email-in.');
          } else if (emailError.code === 'auth/email-already-in-use') {
            setEditProfileError('Ky email është tashmë në përdorim.');
          } else {
            setEditProfileError('Ndodhi një gabim gjatë ndryshimit të email-it.');
          }
          setUpdatingProfile(false);
          return;
        }
      }

      await saveUserProfile(user.uid, {
        bio,
        lastUpdated: new Date().toISOString()
      });

      if (auth.currentUser) {
        await auth.currentUser.reload();
        setUser(Object.assign({}, auth.currentUser));
      }

      setEditProfileModalVisible(false);
      Alert.alert('Sukses', 'Profili u përditësua me sukses!');
    } catch (error: any) {
      console.error('Error in handlePublishRecipe:', error);
      Alert.alert(
        'Gabim në ruajtjen e recetës',
        `Detaje të gabimit: ${error.message || 'Gabim i panjohur'}`
      );
      console.error('Error updating profile:', error);
      setEditProfileError('Ndodhi një gabim. Ju lutem provoni përsëri.');
    } finally {
      setUpdatingProfile(false);
      setCurrentPassword('');
    }
  };

  const handleAuth = async () => {
    setErrorMessage('');

    if (!isLogin && !username.trim()) {
      setErrorMessage('Ju lutem shkruani emrin tuaj.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Ju lutem shkruani email-in tuaj apo emrin tuaj.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Ju lutem shkruani fjalëkalimin tuaj.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Passwordi duhet të ketë të paktën 8 karaktere.');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (cred.user) {
          await updateProfile(cred.user, { displayName: username });
        }
      }
      setModalVisible(false);
      setEmail('');
      setPassword('');
      setUsername('');
      setErrorMessage('');
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found') {
        setErrorMessage('Incorrect email or password.');
      } else if (e.code === 'auth/too-many-requests') {
        setErrorMessage('Too many failed login attempts. Please try again later.');
      } else {
        setErrorMessage(e.message || 'An error occurred during authentication.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) return null;

  return (
    <ImageBackground
      source={require('../assets/images/background.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.backgroundOverlay} />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container}>
        {user ? (
          <>
            <View style={styles.profileCard}>
              <Image
                source={{
                  uri: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName?.charAt(0)}&background=007AFF&color=fff`,
                }}
                style={styles.avatar}
              />
              <Text style={styles.greeting}>Mirësevini, {user.displayName}!</Text>
              {bio ? <Text style={styles.bioText}>{bio}</Text> : null}
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={openEditProfileModal}
              >
                <Ionicons name="pencil-outline" size={16} color="#fff" />
                <Text style={styles.editProfileText}>Ndrysho profilin</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.publishRecipeButton} onPress={openRecipeModal}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.publishRecipeText}>Publiko Recetë</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
              <Text style={styles.btnText}>Dil nga llogaria</Text>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.centeredContainer}>
            <Text style={styles.greeting}>Mirësevini në profilin tuaj</Text>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.btnTextt}>Regjistrohu / Kyçu</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContainer,
            isMobile && styles.modalContainerMobile,
            isTablet && styles.modalContainerTablet
          ]}>
            <Text style={styles.modalTitle}>
              {isLogin ? 'Kyçu në llogari' : 'Krijo llogari'}
            </Text>

            {!isLogin && (
              <TextInput
                placeholder="Username"
                style={styles.input}
                value={username}
                onChangeText={setUsername}
              />
            )}
            <TextInput
              placeholder="Email"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Fjalëkalimi"
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color="#007AFF"
                />
              </TouchableOpacity>
            </View>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.btnTextt}>Loading...</Text>
              ) : (
                <Text style={styles.btnTextt}>{isLogin ? 'Kyçu' : 'Regjistrohu'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text style={styles.switchText}>
                {isLogin
                  ? 'Nuk ke llogari? Regjistrohu'
                  : 'Ke llogari? Kyçu këtu'}
              </Text>
            </TouchableOpacity>

            {isLogin && (
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close-circle" size={28} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={editProfileModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContainer,
            isMobile && styles.modalContainerMobile,
            isTablet && styles.modalContainerTablet
          ]}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>Ndrysho Profilin</Text>

              <Text style={styles.inputLabel}>Emri i Përdoruesit</Text>
              <TextInput
                placeholder="Emri i përdoruesit"
                style={styles.input}
                value={newDisplayName}
                onChangeText={setNewDisplayName}
              />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                placeholder="Email"
                style={styles.input}
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
              />

              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                placeholder="Shkruani diçka rreth vetes..."
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
              />

              {newEmail !== user?.email && (
                <>
                  <Text style={styles.inputLabel}>Fjalëkalimi aktual (për ndryshimin e email-it)</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      placeholder="Fjalëkalimi aktual"
                      style={styles.passwordInput}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry={true}
                    />
                  </View>
                </>
              )}

              <Text style={styles.inputLabel}>Foto e profilit</Text>

              <TouchableOpacity
                style={styles.uploadPhotoButton}
                onPress={pickImage}
              >
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.uploadPhotoText}>Ngarko foto nga pajisja</Text>
              </TouchableOpacity>

              {uploadedImage ? (
                <View style={styles.uploadedImageContainer}>
                  <Image source={{ uri: uploadedImage }} style={styles.previewImage} />
                  <Text style={styles.imageSelectedText}>Foto e zgjedhur - klikoni Ruaj për ta ruajtur</Text>
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setUploadedImage(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Ose zgjidhni një avatar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarList}>
                {avatarOptions.map((avatar, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.avatarOption, selectedAvatarIndex === index && styles.selectedAvatarOption]}
                    onPress={() => {
                      setSelectedAvatarIndex(index);
                      setUploadedImage(null);
                    }}
                  >
                    <Image source={{ uri: avatar }} style={styles.avatarOptionImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {editProfileError ? (
                <Text style={styles.errorText}>{editProfileError}</Text>
              ) : null}

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setEditProfileModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Anullo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, updatingProfile && styles.btnDisabled]}
                  onPress={handleUpdateProfile}
                  disabled={updatingProfile}
                >
                  {updatingProfile ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Ruaj</Text>
                  )}
                </TouchableOpacity>
              </View>

            </ScrollView>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setEditProfileModalVisible(false)}
            >
              <Ionicons name="close-circle" size={28} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Recipe Creation Modal */}
      <Modal visible={recipeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <RNKeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: '100%', alignItems: 'center', flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
          >
            <View style={[
              styles.modalContainer, 
              styles.recipeModalContainer,
              isMobile && styles.recipeModalContainerMobile,
              isTablet && styles.recipeModalContainerTablet
            ]}>
              <Text style={[styles.modalTitle, { color: '#333', marginBottom: 15, fontSize: 24 }]}>Ruaj Recetë të Re</Text>

              <ScrollView
                contentContainerStyle={styles.modalScrollContentStyle}
                showsVerticalScrollIndicator={true}
                style={styles.recipeScrollView}
                nestedScrollEnabled={true}
              >
                <View style={styles.formSection}>
                  <View style={styles.formHeader}>
                    <Ionicons name="restaurant-outline" size={20} color="#4CAF50" />
                    <Text style={styles.sectionTitle}>Detajet e Recetës</Text>
                  </View>

                  <Text style={styles.inputLabel}>Emri i Recetës<Text style={styles.requiredStar}>*</Text></Text>
                  <TextInput
                    placeholder="Shkruani emrin e recetës"
                    style={[styles.input, !recipeName.trim() && styles.inputWarning]}
                    value={recipeName}
                    onChangeText={setRecipeName}
                    maxLength={50}
                  />
                  <Text style={styles.characterCount}>{recipeName.length}/50</Text>
                </View>

                <View style={styles.formSection}>
                  <View style={styles.formHeader}>
                    <Ionicons name="list-outline" size={20} color="#4CAF50" />
                    <Text style={styles.sectionTitle}>Përbërësit<Text style={styles.requiredStar}>*</Text></Text>
                  </View>
                  <Text style={styles.inputHelper}>Shkruani çdo përbërës në një rresht të ri</Text>
                  <TextInput
                    placeholder="P.sh.\n2 vezë\n100g miell\n50ml qumësht\n..."
                    style={[styles.input, styles.recipeTextArea, !recipeIngredients.trim() && styles.inputWarning]}
                    value={recipeIngredients}
                    onChangeText={setRecipeIngredients}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                  />

                  {recipeIngredients.trim() ? (
                    <Text style={styles.ingredientCount}>
                      {recipeIngredients.split('\n').filter(line => line.trim().length > 0).length} përbërës
                    </Text>
                  ) : null}
                </View>

                <View style={styles.formSection}>
                  <View style={styles.formHeader}>
                    <Ionicons name="document-text-outline" size={20} color="#4CAF50" />
                    <Text style={styles.sectionTitle}>Udhëzimet<Text style={styles.requiredStar}>*</Text></Text>
                  </View>
                  <Text style={styles.inputHelper}>Përshkruani hapat e përgatitjes së recetës</Text>
                  <TextInput
                    placeholder="Përshkruani procesin e përgatitjes hap pas hapi..."
                    style={[styles.input, styles.recipeTextArea, styles.instructionsArea, !recipeInstructions.trim() && styles.inputWarning]}
                    value={recipeInstructions}
                    onChangeText={setRecipeInstructions}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.formSection}>
                  <View style={styles.formHeader}>
                    <Ionicons name="image-outline" size={20} color="#4CAF50" />
                    <Text style={styles.sectionTitle}>Foto e Recetës</Text>
                  </View>
                  <Text style={styles.inputHelper}>Shtoni një foto të gatimit përfundimtar (opsionale)</Text>

                  <TouchableOpacity
                    style={styles.uploadPhotoButton}
                    onPress={pickRecipeImage}
                  >
                    <Ionicons name="camera" size={20} color="#fff" />
                    <Text style={styles.uploadPhotoText}>Ngarko foto të recetës</Text>
                  </TouchableOpacity>

                  {recipeImage ? (
                    <View style={styles.uploadedImageContainer}>
                      <Image source={{ uri: recipeImage }} style={styles.recipePreviewImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setRecipeImage(null)}
                      >
                        <Ionicons name="close-circle" size={24} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>

              </ScrollView>

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    if (recipeName.trim() || recipeIngredients.trim() || recipeInstructions.trim() || recipeImage) {
                      Alert.alert(
                        'Anulo krijimin e recetës',
                        'A jeni të sigurt që dëshironi të anuloni? Të gjitha të dhënat do të humbasin.',
                        [
                          { text: 'Vazhdo', style: 'cancel' },
                          { 
                            text: 'Anulo', 
                            style: 'destructive',
                            onPress: () => {
                              setRecipeModalVisible(false);
                              setRecipeName('');
                              setRecipeIngredients('');
                              setRecipeInstructions('');
                              setRecipeImage(null);
                            }
                          }
                        ]
                      );
                    } else {
                      setRecipeModalVisible(false);
                    }
                  }}
                  disabled={publishingRecipe}
                >
                  <Text style={styles.cancelButtonText}>Anulo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, publishingRecipe && styles.btnDisabled]}
                  onPress={handlePublishRecipe}
                  disabled={publishingRecipe}
                >
                  {publishingRecipe ? (
                    <View style={styles.saveButtonContent}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={[styles.saveButtonText, styles.savingTextStyle]}>Duke ruajtur...</Text>
                    </View>
                  ) : (
                    <View style={styles.saveButtonContent}>
                      <Ionicons name="save-outline" size={18} color="#fff" />
                      <Text style={styles.saveButtonText}>Ruaj Recetën</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  if (recipeName.trim() || recipeIngredients.trim() || recipeInstructions.trim() || recipeImage) {
                    Alert.alert(
                      'Mbyll modalën',
                      'A jeni të sigurt që dëshironi të mbyllni? Të gjitha të dhënat do të humbasin.',
                      [
                        { text: 'Vazhdo', style: 'cancel' },
                        { 
                          text: 'Mbyll', 
                          style: 'destructive',
                          onPress: () => {
                            setRecipeModalVisible(false);
                            setRecipeName('');
                            setRecipeIngredients('');
                            setRecipeInstructions('');
                            setRecipeImage(null);
                          }
                        }
                      ]
                    );
                  } else {
                    setRecipeModalVisible(false);
                  }
                }}
                disabled={publishingRecipe}
              >
                <Ionicons name="close-circle" size={28} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </RNKeyboardAvoidingView>
        </View>
      </Modal>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  container: {
    flexGrow: 1,
    padding: isMobile ? 16 : 24,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    alignItems: 'center',
    padding: isMobile ? 16 : 24,
    marginBottom: 20,
    elevation: 6,
    width: isMobile ? '100%' : '80%',
    alignSelf: 'center',
  },
  avatar: {
    width: isMobile ? 80 : 100,
    height: isMobile ? 80 : 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  uploadedImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 5,
  },
  imageSelectedText: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  greeting: {
    fontSize: isMobile ? 18 : 22,
    fontWeight: '600',
    color: '#004d40',
    textAlign: 'center',
    marginBottom: 12,
  },
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 40,
    width: '40%',
    height: '30%',
    alignSelf: 'center',
    elevation: 6,
    marginBottom: '2%',
  },
  section: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(11, 11, 11)',
    textAlign: 'center',
    marginBottom: 12,
    paddingBottom: 40,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: '20%',
    paddingRight: '20%',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#004d40',
  },
  btnPrimary: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 5,
    width: isMobile ? '100%' : 350,
  },
  btnLogout: {
    flexDirection: 'row',
    backgroundColor: '#e53935',
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    elevation: 4,
    width: isMobile ? '100%' : 640,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '400',
    fontSize: 17,
    paddingLeft: isMobile ? '10%' : '10%',
    alignSelf: 'center',
  },
  btnTextt: {
    color: '#fff',
    fontWeight: '400',
    fontSize: 17,
    
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: isDesktop ? '28%' : isTablet ? '60%' : '90%',
    maxHeight: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    alignItems: 'center',
  },
  modalContainerMobile: {
    width: '90%',
    padding: 16,
  },
  modalContainerTablet: {
    width: '70%',
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 60,
    width: '100%',
  },
  modalTitle: {
    fontSize: isMobile ? 20 : 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    marginBottom: 15,
    width: '90%',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  formSection: {
    marginBottom: 20,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  switchText: {
    color: '#007AFF',
    marginTop: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  forgotPasswordText: {
    color: '#007AFF',
    marginTop: 15,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  errorText: {
    color: '#e53935',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  btnDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    width: isMobile ? '100%' : 370,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    borderRadius: 12,
    width: '90%',
    
  },
  eyeIcon: {
    padding: 10,
  },
  editProfileButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
  },
  bioText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 10,
    fontStyle: 'italic',
    maxWidth: '80%',
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  inputLabel: {
    alignSelf: 'flex-start',
    marginLeft: 10,
    marginBottom: 5,
    color: '#555',
    fontSize: 14,
    fontWeight: '500',
  },
  avatarList: {
    flexDirection: 'row',
    marginVertical: 10,
    maxHeight: 80,
  },
  avatarOption: {
    width: isMobile ? 50 : 60,
    height: isMobile ? 50 : 60,
    borderRadius: 30,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAvatarOption: {
    borderColor: '#007AFF',
  },
  avatarOptionImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  uploadPhotoButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  uploadPhotoText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: isMobile ? 14 : 16,
    fontWeight: '500',
  },
  uploadedImageContainer: {
    position: 'relative',
    marginVertical: 10,
    alignItems: 'center',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  publishRecipeButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 12,
    elevation: 4,
    width: isMobile ? '100%' : 640,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  publishRecipeText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 17,
    paddingLeft: 10,
  },
  recipeModalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: 15,
    padding: 20,
    shadowRadius: 8,
    elevation: 8,
  },
  recipeModalContainerMobile: {
    width: '95%',
    padding: 16,
  },
  recipeModalContainerTablet: {
    width: '85%',
  },
  recipeScrollView: {
    width: '100%',
    flex: 1,
    paddingVertical: 10,
    marginBottom: 10,
  },
  modalScrollContentStyle: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  recipeTextArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
    fontSize: 15,
  },
  instructionsArea: {
    height: 150,
  },
  formSectionDivider: {
    width: '100%',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 15,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  requiredStar: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  inputHelper: {
    fontSize: 13,
    color: '#777',
    marginBottom: 8,
    marginLeft: 10,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  characterCount: {
    fontSize: 12,
    color: '#777',
    textAlign: 'right',
    marginTop: 4,
    marginRight: 5,
    fontWeight: '500',
  },
  ingredientCount: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 5,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  inputWarning: {
    borderColor: '#FFCC00',
    borderWidth: 1.5,
    backgroundColor: '#FFFDE7',
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingText: {
    marginLeft: 8,
  },
  recipePreviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
    marginTop: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    padding: 3,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    width: '100%',
    paddingHorizontal: 5,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#555',
    fontWeight: '500',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderWidth: 1,
    borderColor: '#43A047',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  savingTextStyle: {
    marginLeft: 8,
  },
});

export default ProfileScreen;