import { Satisfy_400Regular, useFonts } from '@expo-google-fonts/satisfy';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { auth } from './firebase';

const { width, height } = Dimensions.get('window');
const isMobile = width < 768;
const isTablet = width >= 768 && width < 1024;
const isDesktop = width >= 1024;

// Custom Authentication Modal Component
interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
}

const AuthModal = ({ visible, onClose, onLogin }: AuthModalProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  if (!visible) return null;
  
  const handleAuth = async () => {
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      if (isLogin) {
        // Login
        await signInWithEmailAndPassword(auth, email, password);
        onClose(); // Close modal on successful login
      } else {
        // Register
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Update profile with username if provided
        if (username && userCredential.user) {
          await updateProfile(userCredential.user, {
            displayName: username
          });
        }
        onClose(); // Close modal on successful registration
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      setErrorMessage(error.message || 'An error occurred during authentication');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
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
            <Text style={styles.btnText}>Loading...</Text>
          ) : (
            <>
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.btnText}>{isLogin ? 'Kyçu' : 'Regjistrohu'}</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.switchTextContent}>
            {isLogin
              ? 'Nuk ke llogari? Regjistrohu'
              : 'Ke llogari? Kyçu këtu'}
          </Text>
        </TouchableOpacity>
        
        {isLogin && (
          <TouchableOpacity>
            <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
        >
          <Ionicons name="close-circle" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ======== INTERFACE DHE TË DHËNA ========

export interface Recipe {
  id: string;
  _id?: string;
  name: string;
  ingredients: string[];
  perberesit?: string[];
  image: any;
  instructions: string;
}

export const exampleRecipes: Recipe[] = [
  {
    id: "1",
    name: "Pica Vegjetariane",
    ingredients: ["brumë pice (i gatshëm ose i bërë në shtëpi)", "150g salcë domatesh", "200g djathë mozzarella (ose djathë vegjetarian)",
      "1 spec i kuq (i prerë rrathë)", "1 spec i gjelbër (i prerë rrathë)", "100g kërpudha të freskëta (të prera)", "50g ullinj të zeza (pa bërthamë)",
      "1 lugë vaj ulliri", "Oregano dhe biber sipas shijes"
    ],
    image: require("../assets/images/vegpizza.jpg"),
    instructions: "Për të bërë një picë vegjetariane, fillimisht përgatitni brumin e picës...🍕 Shijojeni picën tuaj vegjetariane! 😊"
  },
];

const SAVED_RECIPES_KEY = '@saved_recipes';
const LAST_SEARCH_KEY = '@last_search';
const SEARCH_HISTORY_KEY = '@search_history';
const SAVED_MEAL_PLANS_KEY = '@saved_meal_plans';

// API base URL - adjust based on platform
const getApiBaseUrl = () => {
  return 'https://reverse-shopping-hiq9.onrender.com';
};

const kerkoReceta = async (ingredients: string): Promise<Recipe[]> => {
  try {
    const baseUrl = getApiBaseUrl();
    console.log('Using API base URL:', baseUrl);
    
    if (!ingredients || ingredients.trim() === '') {
      console.log('Fetching all recipes from:', `${baseUrl}/recipes`);
      const response = await axios.get(`${baseUrl}/recipes`);
      console.log('API Response status:', response.status);
      console.log('API Response data type:', typeof response.data);
      console.log(`Fetched ${response.data ? response.data.length : 0} recipes from MongoDB`);
      
      if (response.data && response.data.length > 0) {
        console.log('Sample recipe from API:', response.data[0]);
      } else {
        console.log('No recipes returned from API');
      }
      
      return mapApiRecipesToLocal(response.data || []);
    }

    const cleanedIngredients = ingredients
      .split(',')
      .map(term => term.trim())
      .filter(term => term.length > 0)
      .join(',');
      
    console.log('Searching recipes with ingredients:', cleanedIngredients);
    const encodedQuery = encodeURIComponent(cleanedIngredients);
    const response = await axios.get(`${baseUrl}/recipes/search?q=${encodedQuery}`);
    
    console.log('API search results status:', response.status);
    console.log('API search results count:', response.data ? response.data.length : 0);
    console.log('Search terms used:', cleanedIngredients);
    
    return mapApiRecipesToLocal(response.data);
  } catch (error) {
    console.error('Error searching recipes from API:', error);
    Alert.alert('Error', 'Could not connect to recipe database. Please try again later.');
    return [];
  }
};

export const recipeImageMap: Record<string, any> = {
  'tavekosi.jpg': require("../assets/images/tavekosi.jpg"),
  'byrekmespinaq.jpg': require("../assets/images/byrekmespinaq.jpg"),
  'fergesetirane.jpg': require("../assets/images/fergesetirane.jpg"),
  'lakrorpresh.jpg': require("../assets/images/lakrorpresh.jpg"),
  'qofteferguara.jpg': require("../assets/images/qofteferguara.jpg"),
  'vegpizza.jpg': require("../assets/images/vegpizza.jpg"),
  'pastacarbonara.jpg': require("../assets/images/pastacarbonara.jpg"),
  'gjelle.jpg': require("../assets/images/gjelle.jpg"),
  'petulla.jpg': require("../assets/images/petulla.jpg"),
  'spacar.jpg': require("../assets/images/spacar.jpg"),
  'pitemespinaq.jpg': require("../assets/images/byrekmespinaq.jpg"),
  'pitekungull.jpg': require("../assets/images/pitemekungull.jpg"),
  'musaka.jpg': require("../assets/images/musaka.jpg"),
  'trahana.jpg': require("../assets/images/supe.jpg"),
  'revani.jpg': require("../assets/images/revani.jpg"),
  'qebapa.jpg': require("../assets/images/qebapa.jpg"),
  'sarma.jpg': require("../assets/images/sarma.jpg"),
  'japrak.jpg': require("../assets/images/japrak.jpg"),
  'flija.jpg': require("../assets/images/flija.jpg"),
  'tavepeshku.jpg': require("../assets/images/tavedheu.jpg"),
  'specatembushur.jpg': require("../assets/images/patellxhanetembushur.jpg"),
  'tava_qengji.jpg': require("../assets/images/tava_qengji.jpg"),
  'fasule.jpg': require("../assets/images/fasule.jpg"),
  
  'jani_bamje.jpg': require("../assets/images/jani_bamje.jpg"),
  'qull_misri.jpg': require("../assets/images/qull_misri.jpg"),
  'peshk_hudher.jpg': require("../assets/images/peshk_hudher.jpg"),
  'komplet_tave.jpg': require("../assets/images/komplet_tave.jpg"),
  'maqe.jpg': require("../assets/images/maqe.jpg"),
  'pilaf_pule.jpg': require("../assets/images/pilaf_pule.jpg"),
  'burek_mish.jpg': require("../assets/images/burek_mish.jpg"),
  'burek_djathe.jpg': require("../assets/images/burek_djathe.jpg"),
  'rrotulla.jpg': require("../assets/images/rrotulla.jpg"),
  'pite_patate.jpg': require("../assets/images/pite_patate.jpg"),
  'pite_purri.jpg': require("../assets/images/pite_purri.jpg"),
  'jufka_pule.jpg': require("../assets/images/jufka_pule.jpg"),
  'mish.jpg': require("../assets/images/mish.jpg"),
  'patellxhan_mbushur.jpg': require("../assets/images/patellxhan_mbushur.jpg"),
  'speca_domate.jpg': require("../assets/images/speca_domate.jpg"),
  'lakror.jpg': require("../assets/images/lakror.jpg"),
  'qebap_patate.jpg': require("../assets/images/qebap_patate.jpg"),
  'comlek.jpg': require("../assets/images/comlek.jpg"),

  'Çomlek me qepë': require("../assets/images/comlek.jpg"),
  'Qebap në furrë me patate': require("../assets/images/qebap_patate.jpg"),
  'Lakror me lakra të egra': require("../assets/images/lakror.jpg"),
  'Speca në tigan me domate': require("../assets/images/speca_domate.jpg"),
  'Patellxhan i mbushur': require("../assets/images/patellxhan_mbushur.jpg"),
  'Biftek': require("../assets/images/mish.jpg"),
  'Jufka me pule': require("../assets/images/jufka_pule.jpg"),
  'Pite me patate': require("../assets/images/pite_patate.jpg"),
  'Pite me purri': require("../assets/images/pite_purri.jpg"),
  'Rrotulla me sheqer': require("../assets/images/rrotulla.jpg"),
  'Burek me djathë': require("../assets/images/burek_djathe.jpg"),
  'Burek me mish': require("../assets/images/burek_mish.jpg"),
  'Pilaf me pule': require("../assets/images/pilaf_pule.jpg"),
  'Maqë me miell misri': require("../assets/images/maqe.jpg"),
  'Komplet tavë': require("../assets/images/komplet_tave.jpg"),
  'Peshk i skuqur me hudher dhe uthull': require("../assets/images/peshk_hudher.jpg"),
  'Qull me miell misri': require("../assets/images/qull_misri.jpg"),
  'Jani me bamje': require("../assets/images/jani_bamje.jpg"),
  'Fasule me lëng': require("../assets/images/fasule.jpg"),
  'Tavë dheu me mish qengji': require("../assets/images/tava_qengji.jpg"),
  'Tavë Kosi': require("../assets/images/tavekosi.jpg"),
  'Byrek me Spinaq': require("../assets/images/byrekmespinaq.jpg"),
  'Fërgesë Tirane': require("../assets/images/fergesetirane.jpg"),
  'Lakror me Presh': require("../assets/images/lakrorpresh.jpg"),
  'Qofte të Fërguara': require("../assets/images/qofteferguara.jpg"),
  'Pica Vegjetariane': require("../assets/images/vegpizza.jpg"),
  'Pasta Carbonara': require("../assets/images/pastacarbonara.jpg"),
  'Musaka Shqiptare': require("../assets/images/musaka.jpg"),
  'Trahana me Pulë': require("../assets/images/supe.jpg"),
  'Petulla me Mjaltë': require("../assets/images/petulla.jpg"),
  'Speca të Mbushur': require("../assets/images/patellxhanetembushur.jpg"),
  'Revani': require("../assets/images/revani.jpg"),
  'Japrak me Gjethe Rrushi': require("../assets/images/japrak.jpg"),
  'Flija': require("../assets/images/flija.jpg"),
  'Tavë Peshku me Perime': require("../assets/images/tavedheu.jpg"),
  'Speca të Mbushur me Oriz': require("../assets/images/patellxhanetembushur.jpg"),
  'Qebapa': require("../assets/images/qebapa.jpg"),
  'Sarma': require("../assets/images/sarma.jpg"),
  'Gjellë me Mish dhe Patate': require("../assets/images/gjellemepatate.jpg"),
  'Pite me Kungull': require("../assets/images/pitemekungull.jpg"),
  'Pite me Spinaq': require("../assets/images/byrekmespinaq.jpg"),
};

const mapApiRecipesToLocal = (apiRecipes: any[]): Recipe[] => {
  return apiRecipes.map((recipe: any) => {
    let imageSource;
    
    if (recipe.name && recipeImageMap[recipe.name]) {
      imageSource = recipeImageMap[recipe.name];
      console.log('Image mapped by name for:', recipe.name);
    }
    else if (recipe.image && typeof recipe.image === 'string' && recipeImageMap[recipe.image]) {
      imageSource = recipeImageMap[recipe.image];
      console.log('Image mapped by filename for:', recipe.name, recipe.image);
    }
    else {
      imageSource = require("../assets/images/recipedd.jpg");
      console.log('Using default image for:', recipe.name);
    }
    
    return {
      id: recipe._id || recipe.id || String(Math.random()),
      name: recipe.name,
      ingredients: recipe.perberesit || [], 
      instructions: recipe.instructions,
      image: imageSource
    };
  });
};

const fetchAllRecipes = async (): Promise<Recipe[]> => {
  try {
    console.log('Fetching all recipes from MongoDB...');
    console.log('API URL:', `${getApiBaseUrl()}/recipes`);
    const response = await axios.get(`${getApiBaseUrl()}/recipes`);
    console.log('API Response:', response);
    console.log(`Fetched ${response.data ? response.data.length : 0} recipes from MongoDB`);
    return mapApiRecipesToLocal(response.data || []);
  } catch (error) {
    console.error('Error fetching recipes from MongoDB:', error);
    Alert.alert('Error', 'Could not connect to recipe database. Please try again later.');
    return [];
  }
};

export default function App() {
  const [searchText, setSearchText] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savedRecipeIds, setSavedRecipeIds] = useState<string[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [showingAllRecipes, setShowingAllRecipes] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(true);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(null);
  
  const [mealPlanModalVisible, setMealPlanModalVisible] = useState(false);
  const [isGeneratingMealPlan, setIsGeneratingMealPlan] = useState(false);
  const [weeklyMealPlan, setWeeklyMealPlan] = useState<{[day: string]: {breakfast: Recipe | null, lunch: Recipe | null, dinner: Recipe | null}}>({});
  const [mealPlanName, setMealPlanName] = useState('My Weekly Meal Plan');
  const [savedMealPlans, setSavedMealPlans] = useState<Array<{id: string, name: string, plan: {[day: string]: {breakfast: Recipe | null, lunch: Recipe | null, dinner: Recipe | null}}, date: string}>>([]);
  
  const [fontsLoaded] = useFonts({
    Satisfy_400Regular,
  });

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        if (user) {
          const savedRecipesJson = await AsyncStorage.getItem(`${SAVED_RECIPES_KEY}_${user.uid}`);
          if (savedRecipesJson) {
            const savedRecipesArray = JSON.parse(savedRecipesJson);
            setSavedRecipes(savedRecipesArray);
            const savedIds = savedRecipesArray.map((recipe: Recipe) => recipe.id);
            setSavedRecipeIds(savedIds);
          }
          
          const savedMealPlansJson = await AsyncStorage.getItem(`${SAVED_MEAL_PLANS_KEY}_${user.uid}`);
          if (savedMealPlansJson) {
            const loadedMealPlans = JSON.parse(savedMealPlansJson);
            setSavedMealPlans(loadedMealPlans);
          }
          
          const timestamp = await AsyncStorage.getItem(`${SAVED_RECIPES_KEY}_${user.uid}_timestamp`);
          setLastSyncTimestamp(timestamp);
        } else {
          setSavedRecipes([]);
          setSavedRecipeIds([]);
          setSavedMealPlans([]);
          setLastSyncTimestamp(null);
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
      } finally {
        setIsLoadingStorage(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  const checkForSavedRecipesUpdates = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const currentTimestamp = lastSyncTimestamp;
      const latestTimestampStr = await AsyncStorage.getItem(`${SAVED_RECIPES_KEY}_${currentUser.uid}_timestamp`);
      
      if (!latestTimestampStr || latestTimestampStr === currentTimestamp) return;
      
      console.log('Saved recipes timestamp changed, reloading saved recipes');
      
      setLastSyncTimestamp(latestTimestampStr);
      
      const savedRecipesJson = await AsyncStorage.getItem(`${SAVED_RECIPES_KEY}_${currentUser.uid}`);
      if (savedRecipesJson) {
        const savedRecipesArray = JSON.parse(savedRecipesJson);
        setSavedRecipes(savedRecipesArray);
        const savedIds = savedRecipesArray.map((recipe: Recipe) => recipe.id);
        setSavedRecipeIds(savedIds);
      } else {
        setSavedRecipes([]);
        setSavedRecipeIds([]);
      }
    } catch (error) {
      console.error('Error checking for saved recipes updates:', error);
    }
  };
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!selectedRecipe) {
        checkForSavedRecipesUpdates();
      }
    }, 2000);
    
    return () => clearInterval(intervalId);
  }, [selectedRecipe, lastSyncTimestamp]);

  const handleGenerateMealPlan = async () => {
    try {
      setMealPlanModalVisible(true);
      setIsGeneratingMealPlan(true);
      
      let recipesForPlan = filteredRecipes.length > 0 ? filteredRecipes : recipes;
      
      if (recipesForPlan.length < 10) {
        try {
          const fetchedRecipes = await fetchAllRecipes();
          if (fetchedRecipes.length > 0) {
            recipesForPlan = fetchedRecipes;
          }
        } catch (error) {
          console.error('Error fetching recipes:', error);
        }
      }
      
      if (recipesForPlan.length < 7) {
        Alert.alert('Gabim', 'Nuk ka mjaftueshëm receta për të gjeneruar një plan javor.');
        setIsGeneratingMealPlan(false);
        setMealPlanModalVisible(false);
        return;
      }

      const days = ['E Hene', 'E Marte', 'E Merkure', 'E Enjte', 'E Premte', 'E Shtune', 'E Diel'];
      const mealPlan: {[day: string]: {breakfast: Recipe | null, lunch: Recipe | null, dinner: Recipe | null}} = {};
      
      const shuffledRecipes = [...recipesForPlan].sort(() => 0.5 - Math.random());
      
      days.forEach((day, index) => {
        const startIndex = index * 3 % shuffledRecipes.length;
        mealPlan[day] = {
          breakfast: shuffledRecipes[(startIndex) % shuffledRecipes.length] || null,
          lunch: shuffledRecipes[(startIndex + 1) % shuffledRecipes.length] || null,
          dinner: shuffledRecipes[(startIndex + 2) % shuffledRecipes.length] || null,
        };
      });
      
      setWeeklyMealPlan(mealPlan);
    } catch (error) {
      console.error('Error generating meal plan:', error);
      Alert.alert('Gabim', 'Ndodhi një gabim gjatë gjenerimit të planit javor.');
      setMealPlanModalVisible(false);
    } finally {
      setIsGeneratingMealPlan(false);
    }
  };

  const saveMealPlan = async () => {
    try {
      if (Object.keys(weeklyMealPlan).length === 0) {
        Alert.alert('Error', 'No meal plan to save. Please generate a meal plan first.');
        return;
      }
      
      const mealPlanId = Date.now().toString();
      const newMealPlan = {
        id: mealPlanId,
        name: mealPlanName || `Meal Plan ${new Date().toLocaleDateString()}`,
        plan: weeklyMealPlan,
        date: new Date().toISOString()
      };
      
      const currentUser = auth.currentUser;
      const storageKey = currentUser 
        ? `${SAVED_MEAL_PLANS_KEY}_${currentUser.uid}` 
        : SAVED_MEAL_PLANS_KEY;
      
      let existingMealPlans = [];
      try {
        const existingData = await AsyncStorage.getItem(storageKey);
        if (existingData) {
          existingMealPlans = JSON.parse(existingData);
        }
      } catch (err) {
        console.error('Error reading existing meal plans:', err);
      }
      
      const updatedMealPlans = [...existingMealPlans, newMealPlan];
      
      if (currentUser) {
        setSavedMealPlans(updatedMealPlans);
      }
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedMealPlans));
      
      Alert.alert('Success', 'Meal plan saved successfully!');
      setMealPlanModalVisible(false);
    } catch (error) {
      console.error('Error saving meal plan:', error);
      Alert.alert('Error', 'Failed to save meal plan. Please try again.');
    }
  };

  const toggleSavedRecipe = async (recipe: Recipe) => {
    try {
      const currentUser = auth.currentUser;
      console.log('Authentication check - Current user:', currentUser ? 'Logged in' : 'Not logged in');
      console.log('Recipe already saved:', savedRecipeIds.includes(recipe.id));
      
      if (!currentUser && !savedRecipeIds.includes(recipe.id)) {
        console.log('Showing authentication alert');
        Alert.alert(
          'Authentication Required', 
          'Please sign up or log in to save this recipe.', 
          [
            { 
              text: 'Log In', 
              onPress: () => {
                console.log('Log In button pressed, redirecting to /auth');
                router.push('/auth');
              },
              style: 'default'
            },
            { 
              text: 'Cancel',
              style: 'cancel'
            }
          ],
          { cancelable: true }
        );
        return;
      }
      
      console.log('Calling toggleSavedRecipe');
      let newSavedRecipes: Recipe[];
      let newSavedIds: string[];
      
      if (savedRecipeIds.includes(recipe.id)) {
        newSavedRecipes = savedRecipes.filter(r => r.id !== recipe.id);
        newSavedIds = savedRecipeIds.filter(id => id !== recipe.id);
        if (recipe._id) {
          try {
            await axios.delete(`${getApiBaseUrl()}/saved-recipes/${recipe._id}`);
            console.log('Recipe removed from backend:', recipe.name);
          } catch (backendError) {
            console.error('Failed to remove recipe from backend:', backendError);
          }
        }
      } else {
        newSavedRecipes = [...savedRecipes, recipe];
        newSavedIds = [...savedRecipeIds, recipe.id];
        
        try {
          const recipeToSave = {
            recipeId: recipe._id || recipe.id,
            name: recipe.name,
            perberesit: recipe.ingredients,
            instructions: recipe.instructions,
            image: typeof recipe.image === 'number' ? '' : recipe.image
          };
          
          const response = await axios.post(`${getApiBaseUrl()}/saved-recipes`, recipeToSave);
          console.log('Recipe saved to backend:', response.data);
          
          if (response.data._id) {
            const updatedRecipe = {...recipe, _id: response.data._id};
            newSavedRecipes = newSavedRecipes.map(r => 
              r.id === recipe.id ? updatedRecipe : r
            );
          }
        } catch (backendError) {
          console.error('Failed to save recipe to backend:', backendError);
        }
      }
      
      setSavedRecipes(newSavedRecipes);
      setSavedRecipeIds(newSavedIds);
      
      const savedData = {
        recipes: newSavedRecipes,
        timestamp: new Date().getTime()
      };
      
      if (currentUser) {
        await AsyncStorage.setItem(`${SAVED_RECIPES_KEY}_${currentUser.uid}`, JSON.stringify(newSavedRecipes));
        await AsyncStorage.setItem(`${SAVED_RECIPES_KEY}_${currentUser.uid}_timestamp`, new Date().getTime().toString());
      }
      
      if (savedRecipeIds.includes(recipe.id)) {
        Alert.alert('Sukses', 'Receta u hoq nga të preferuarat');
      } else {
        Alert.alert('Sukses', 'Receta u shtua te të preferuarat');
      }
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('Gabim', 'Ndodhi një gabim gjatë ruajtjes së recetës');
    }
  };

  const handleSearch = async () => {
    setHasSearched(true);
    setIsSearching(true);
    
    if (!searchText.trim()) {
      Alert.alert('Kujdes', 'Ju lutemi shkruani të paktën një përbërës për të kërkuar.');
      setIsSearching(false);
      return;
    }
    
    try {
      const results = await kerkoReceta(searchText);
      setRecipes(results);
    } catch (error) {
      console.error('Error searching recipes:', error);
      Alert.alert('Gabim', 'Ndodhi një gabim gjatë kërkimit të recetave.');
      setRecipes([]);
    } finally {
      setIsSearching(false);
    }
  };

  if (!fontsLoaded || isLoadingStorage) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (selectedRecipe) {
    return (
      <RecipeDetail
        recipe={selectedRecipe}
        onBack={() => setSelectedRecipe(null)}
        toggleSavedRecipe={() => toggleSavedRecipe(selectedRecipe)}
        isSaved={savedRecipeIds.includes(selectedRecipe.id)}
        router={router}
      />
    );
  }

  return (
    <>
      <HomePage
        onSelectRecipe={setSelectedRecipe}
        searchQuery={searchText}
        setSearchQuery={setSearchText}
        onSearch={handleSearch}
        filteredRecipes={recipes}
        setFilteredRecipes={setRecipes}
        hasSearched={hasSearched}
        setHasSearched={setHasSearched}
        savedRecipeIds={savedRecipeIds}
        toggleSavedRecipe={toggleSavedRecipe}
        isSearching={isSearching}
        setIsSearching={setIsSearching}
        isLoading={isLoading}
        router={router}
        handleGenerateMealPlan={handleGenerateMealPlan}
        showingAllRecipes={showingAllRecipes}
        setShowingAllRecipes={setShowingAllRecipes}
      />
      
      <Modal
        visible={mealPlanModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMealPlanModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.mealPlanModalContainer,
            isMobile && styles.mealPlanModalContainerMobile,
            isTablet && styles.mealPlanModalContainerTablet
          ]}>
            <View style={styles.mealPlanModalHeader}>
              <Text style={styles.mealPlanModalTitle}>Plan javor vaktesh</Text>
              <TouchableOpacity onPress={() => setMealPlanModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {isGeneratingMealPlan ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={{marginTop: 10}}>Generating your meal plan...</Text>
              </View>
            ) : (
              <ScrollView style={styles.mealPlanScrollView}>
                {Object.keys(weeklyMealPlan).map((day) => (
                  <View key={day} style={styles.dayContainer}>
                    <Text style={styles.dayTitle}>{day}</Text>
                    <View style={styles.mealsContainer}>
                      <View style={styles.mealItem}>
                        <Text style={styles.mealType}>Mengjesi</Text>
                        {weeklyMealPlan[day].breakfast ? (
                          <TouchableOpacity 
                            onPress={() => {
                              setSelectedRecipe(weeklyMealPlan[day].breakfast);
                              setMealPlanModalVisible(false);
                            }}
                          >
                            <Text style={[styles.mealName, styles.clickableRecipe]}>
                              {weeklyMealPlan[day].breakfast.name}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.mealName}>No recipe</Text>
                        )}
                      </View>
                      <View style={styles.mealItem}>
                        <Text style={styles.mealType}>Dreka</Text>
                        {weeklyMealPlan[day].lunch ? (
                          <TouchableOpacity 
                            onPress={() => {
                              setSelectedRecipe(weeklyMealPlan[day].lunch);
                              setMealPlanModalVisible(false);
                            }}
                          >
                            <Text style={[styles.mealName, styles.clickableRecipe]}>
                              {weeklyMealPlan[day].lunch.name}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.mealName}>No recipe</Text>
                        )}
                      </View>
                      <View style={styles.mealItem}>
                        <Text style={styles.mealType}>Darka</Text>
                        {weeklyMealPlan[day].dinner ? (
                          <TouchableOpacity 
                            onPress={() => {
                              setSelectedRecipe(weeklyMealPlan[day].dinner);
                              setMealPlanModalVisible(false);
                            }}
                          >
                            <Text style={[styles.mealName, styles.clickableRecipe]}>
                              {weeklyMealPlan[day].dinner.name}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.mealName}>No recipe</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            
            <View style={styles.mealPlanButtonsContainer}>
              <TextInput
                style={styles.mealPlanNameInput}
                placeholder="Vendos nje emer"
                value={mealPlanName}
                onChangeText={setMealPlanName}
              />
              <View style={styles.mealPlanActionButtons}>
                <TouchableOpacity 
                  style={[styles.mealPlanActionButton, styles.regenerateButton]}
                  onPress={handleGenerateMealPlan}
                >
                  <Text style={styles.buttonText}>Rigjeneroje</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.mealPlanActionButton, styles.saveButton]}
                  onPress={saveMealPlan}
                >
                  <Text style={styles.buttonText}>Ruaj</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export interface HomePageProps {
  onSelectRecipe: (recipe: Recipe) => void;
  searchQuery: string;
  setSearchQuery: (text: string) => void;
  onSearch: () => void;
  filteredRecipes: Recipe[];
  setFilteredRecipes: (recipes: Recipe[]) => void;
  hasSearched: boolean;
  setHasSearched: (value: boolean) => void;
  savedRecipeIds: string[];
  toggleSavedRecipe: (recipe: Recipe) => void;
  isSearching: boolean;
  setIsSearching: (value: boolean) => void;
  isLoading: boolean;
  router: any;
  handleGenerateMealPlan: () => void;
  showingAllRecipes: boolean;
  setShowingAllRecipes: (value: boolean) => void;
}

function HomePage({
  onSelectRecipe,
  searchQuery,
  setSearchQuery,
  onSearch,
  filteredRecipes,
  setFilteredRecipes,
  hasSearched,
  setHasSearched,
  savedRecipeIds,
  toggleSavedRecipe,
  isSearching,
  setIsSearching,
  isLoading,
  router,
  handleGenerateMealPlan,
  showingAllRecipes,
  setShowingAllRecipes
}: HomePageProps) {
  const searchInputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [recipeToSave, setRecipeToSave] = useState<Recipe | null>(null);

  const clearSearch = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSearchQuery("");
      setFilteredRecipes([]);
      setHasSearched(false);
      setShowingAllRecipes(false);
      fadeAnim.setValue(1);
      searchInputRef.current?.focus();
    });
  };

  const renderRecipeList = () => {
    if (isSearching) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 30 }}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 15, fontSize: 16, color: '#555' }}>
            Duke kërkuar recetat...
          </Text>
        </View>
      );
    }

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.searchHelpText}>
            Shkruani përbërësit që keni në dispozicion, të ndara me presje. Do të shfaqen recetat që përmbajnë TË GJITHË përbërësit e specifikuar.
          </Text>
        </View>
      );
    }

    if (filteredRecipes.length === 0 && hasSearched) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
          <Ionicons name="sad-outline" size={60} color="#888" />
          <Text style={{ marginTop: 15, fontSize: 18, color: '#555', textAlign: 'center', paddingHorizontal: 30 }}>
            Nuk u gjetën receta me këta përbërës.
            Provoni të kërkoni me përbërës të tjerë ose kontrolloni drejtshkrimin.
          </Text>
        </View>
      );
    }

    return (
      <>
        {hasSearched && !showingAllRecipes && (
          <View style={styles.searchResultsHeader}>
            <Text style={styles.searchResultsTitle}>
              Recetat me: <Text style={styles.searchedIngredients}>{searchQuery}</Text>
            </Text>
            <Text style={styles.resultsCount}>{filteredRecipes.length} receta</Text>
          </View>
        )}
        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          numColumns={isMobile ? 2 : isTablet ? 3 : 4}
          columnWrapperStyle={styles.columnWrapper}
          style={styles.flatListContent}
          contentContainerStyle={[
            styles.listContentPadding,
            {paddingTop: showingAllRecipes ? 20 : 0}
          ]}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onSelectRecipe(item)}
              style={[
                styles.recipeCard,
                isMobile && styles.recipeCardMobile,
                isTablet && styles.recipeCardTablet
              ]}
              activeOpacity={0.8}
            >
              <ImageBackground
                source={item.image}
                style={styles.recipeImage}
                imageStyle={styles.imageStyle}
              >
                <TouchableOpacity
                  style={styles.heartButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    console.log('HomePage - Heart button pressed for recipe:', item.name);
                    const currentUser = auth.currentUser;
                    console.log('HomePage - Authentication check - Current user:', currentUser ? 'Logged in' : 'Not logged in');
                    console.log('HomePage - Recipe already saved:', savedRecipeIds.includes(item.id));
                    
                    if (!currentUser && !savedRecipeIds.includes(item.id)) {
                      console.log('HomePage - Showing authentication modal');
                      setRecipeToSave(item);
                      setAuthModalVisible(true);
                      return;
                    }
                    
                    console.log('HomePage - Calling toggleSavedRecipe');
                    toggleSavedRecipe(item);
                  }}
                >
                  <Ionicons
                    name={savedRecipeIds.includes(item.id) ? "heart" : "heart-outline"}
                    size={24}
                    color={savedRecipeIds.includes(item.id) ? "red" : "white"}
                  />
                </TouchableOpacity>
                <View style={styles.imageOverlay}>
                  <Text style={styles.recipeName} numberOfLines={2}>{item.name}</Text>
                  <View style={styles.recipeFooter}>
                    <Text style={styles.viewRecipeText}>Shiko recetën</Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                  </View>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          )}
        />
      </>
    );
  };

  return (
    <View style={{flex: 1}}>
      <ImageBackground 
        source={require("../assets/images/background.jpg")} 
        style={styles.fullscreenBackground}
        resizeMode="cover"
      >
        <View style={styles.backgroundOverlay}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
          >
            <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : "height"} 
              style={styles.container}
              keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
            >
              {!hasSearched && !showingAllRecipes && (
                <View style={styles.headerContainer}>
                  <Text style={styles.appTitle}>REVERSE SHOPPING</Text>
                  <Text style={styles.appSubtitle}>Zbulo receta të reja dhe krijo magji në kuzhinë.</Text>
                </View>
              )}

              <View style={[
                styles.searchContainer, 
                hasSearched && styles.searchContainerSmall,
                isMobile && styles.searchContainerMobile,
                isTablet && styles.searchContainerTablet
              ]}>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    placeholder="Kërko sipas përbërësve (p.sh. domate, mish)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={onSearch}
                  />
                  {searchQuery.length > 0 && (
                    <Animated.View style={{ opacity: fadeAnim }}>
                      <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                        <Ionicons name="close-circle" size={20} color="#aaa" />
                      </TouchableOpacity>
                    </Animated.View>
                  )}
                  <TouchableOpacity
                    onPress={onSearch}
                    style={styles.searchButton}
                    disabled={searchQuery.trim() === ""}
                  >
                    <Ionicons name="send" size={20} color="white" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.searchHelpText}></Text>
                
                <View style={styles.buttonRow}>
                  <View style={[
                    styles.buttonContainer,
                    isMobile && styles.buttonContainerMobile
                  ]}>
                    <TouchableOpacity 
                      style={[
                        styles.showAllButton,
                        isMobile && styles.showAllButtonMobile
                      ]} 
                      onPress={async () => {
                        setIsSearching(true);
                        setShowingAllRecipes(true);
                        try {
                          const allRecipes = await fetchAllRecipes();
                          setFilteredRecipes(allRecipes);
                          setHasSearched(false);
                        } catch (error) {
                          console.error('Error fetching all recipes:', error);
                          Alert.alert('Gabim', 'Ndodhi një gabim gjatë marrjes së recetave.');
                        } finally {
                          setIsSearching(false);
                        }
                      }}
                    >
                      <Ionicons name="grid-outline" size={18} color="white" style={{marginRight: 8}} />
                      <Text style={styles.showAllButtonText}>Shfaq të gjitha recetat</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[
                        styles.mealPlanButton,
                        isMobile && styles.mealPlanButtonMobile
                      ]} 
                      onPress={handleGenerateMealPlan}
                    >
                      <Ionicons name="calendar-outline" size={18} color="white" style={{marginRight: 8}} />
                      <Text style={styles.showAllButtonText}>Gjenero një plan javor vaktesh</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {renderRecipeList()}
            </KeyboardAvoidingView>
          </ScrollView>
        </View>
      </ImageBackground>
      
      <AuthModal 
        visible={authModalVisible} 
        onClose={() => setAuthModalVisible(false)} 
        onLogin={() => {
          console.log('AuthModal - Login handled directly in the modal');
        }}
      />
    </View>
  );
}

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
  toggleSavedRecipe: () => void;
  isSaved: boolean;
  router: any;
}

function RecipeDetail({ recipe, onBack, toggleSavedRecipe, isSaved, router }: RecipeDetailProps) {
  const [authModalVisible, setAuthModalVisible] = useState(false);
  
  const handleSaveRecipe = () => {
    const currentUser = auth.currentUser;
    console.log('RecipeDetail - Authentication check - Current user:', currentUser ? 'Logged in' : 'Not logged in');
    console.log('RecipeDetail - Recipe already saved:', isSaved);
    
    if (!currentUser && !isSaved) {
      console.log('RecipeDetail - Showing authentication modal');
      setAuthModalVisible(true);
      return;
    }
    
    console.log('RecipeDetail - Calling toggleSavedRecipe');
    toggleSavedRecipe();
  };

  return (
    <View style={{flex: 1}}>
      <ImageBackground source={require("../assets/images/recipedd.jpg")} style={styles.bbackground} resizeMode="cover">
        <View style={[styles.backgroundOverlay, {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}]} />
        <ScrollView style={styles.detailScrollContainer} contentContainerStyle={styles.detailScrollContentContainer}>
          <View style={styles.detailHeaderContainer}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.detailTitle} numberOfLines={1} ellipsizeMode='tail'>
              {recipe.name}
            </Text>
            <TouchableOpacity
              onPress={handleSaveRecipe}
              style={styles.detailHeartButton}
            >
              <Ionicons
                name={isSaved ? "heart" : "heart-outline"}
                size={28}
                color={isSaved ? "red" : "#333"}
              />
            </TouchableOpacity>
          </View>

          <View style={[
            styles.detailTopRowContainer,
            isMobile && styles.detailTopRowContainerMobile,
            isTablet && styles.detailTopRowContainerTablet
          ]}>
            <View style={[
              styles.detailImageContainer,
              isMobile && styles.detailImageContainerMobile,
              isTablet && styles.detailImageContainerTablet
            ]}>
              <Image source={recipe.image} style={styles.detailImage} resizeMode="cover" />
            </View>
            <View style={[
              styles.detailIngredientsContainer,
              isMobile && styles.detailIngredientsContainerMobile,
              isTablet && styles.detailIngredientsContainerTablet
            ]}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Përbërësit</Text>
                {recipe.ingredients.map((ingredient, index) => (
                  <View key={index} style={styles.ingredientItem}>
                    <Ionicons name="ellipse" size={8} color="#007AFF" style={styles.ingredientIcon} />
                    <Text style={styles.ingredientText}>{ingredient}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={[
            styles.detailInstructionsContainer,
            isMobile && styles.detailInstructionsContainerMobile,
            isTablet && styles.detailInstructionsContainerTablet
          ]}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Udhëzimet</Text>
              <Text style={styles.instructionsText}>
                {recipe.instructions}
              </Text>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
      
      <AuthModal 
        visible={authModalVisible} 
        onClose={() => setAuthModalVisible(false)} 
        onLogin={() => {
          console.log('RecipeDetail - Login handled directly in the modal');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: isMobile ? 30 : 50,
  },
  fullScreenContent: {
    flexGrow: 1,
    minHeight: Dimensions.get('window').height,
    paddingBottom: 100,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 20,
  },
  modalContainer: {
    width: isDesktop ? '30%' : isTablet ? '50%' : '85%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    elevation: 20,
    alignItems: 'center',
    paddingTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    maxHeight: '80%',
  },
  modalContainerMobile: {
    width: '90%',
    padding: 20,
  },
  modalContainerTablet: {
    width: '70%',
  },
  modalTitle: {
    fontSize: isMobile ? 18 : 20,
    fontWeight: '700',
    marginBottom: 18,
    color: '#007AFF',
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#444',
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
    width: '100%',
  },
  btnText: {
    color: '#fff',
    fontWeight: '400',
    fontSize: isMobile ? 15 : 17,
    marginLeft: 8,
  },
  switchText: {
    marginTop: 16,
    padding: 8,
  },
  switchTextContent: {
    color: '#007AFF',
    marginTop: 12,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: isMobile ? 14 : 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    width: '100%',
    padding: isMobile ? 12 : 14,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: isMobile ? 15 : 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  passwordContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    padding: isMobile ? 12 : 14,
    fontSize: isMobile ? 15 : 16,
  },
  eyeIcon: {
    padding: 10,
  },
  btnDisabled: {
    opacity: 0.7,
    backgroundColor: '#999',
  },
  forgotPasswordText: {
    color: '#007AFF',
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  bbackground: {
    flex: 1,
    width: "100%",
    minHeight: '100%'
  },
  backgroundOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: '100%',
    flex: 1,
  },
  buttonRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
    maxWidth: 600,
  },
  buttonContainerMobile: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  showAllButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flex: 1,
    maxWidth: 300,
  },
  showAllButtonMobile: {
    marginRight: 0,
    marginBottom: 10,
    width: '100%',
    maxWidth: '100%',
  },
  mealPlanButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxWidth: 300,
  },
  mealPlanButtonMobile: {
    width: '100%',
    maxWidth: '100%',
  },
  showAllButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: isMobile ? 13 : 14,
  },
  detailScrollContainer: {
    flex: 1,
  },
  detailScrollContentContainer: {
    paddingBottom: 40,
    paddingHorizontal: isMobile ? 15 : 25,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  detailHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 15,
    paddingHorizontal: 15,
    marginBottom: 20,
    width: '100%',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  detailTitle: {
    flex: 1,
    fontSize: isMobile ? 20 : 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerPlaceholderRight: {
    width: 36,
    height: 36,
  },
  detailTopRowContainer: {
    flexDirection: isMobile ? 'column' : 'row',
    width: '100%',
    marginBottom: 20,
    gap: isMobile ? 15 : 20,
    alignItems: 'center',
  },
  detailTopRowContainerMobile: {
    flexDirection: 'column',
  },
  detailTopRowContainerTablet: {
    flexDirection: 'row',
  },
  detailImageContainer: {
    width: isMobile ? '80%' : '40%',
    aspectRatio: 1,
    borderRadius: 240,
    overflow: 'hidden',
    backgroundColor: '#eee',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
    alignSelf: isMobile ? 'center' : undefined,
  },
  detailImageContainerMobile: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 200,
  },
  detailImageContainerTablet: {
    width: '45%',
  },
  detailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 240,
  },
  detailIngredientsContainer: {
    width: isMobile ? '100%' : '55%',
    padding: isMobile ? 15 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  detailIngredientsContainerMobile: {
    width: '100%',
  },
  detailIngredientsContainerTablet: {
    width: '50%',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: isMobile ? 18 : 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 5,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  ingredientIcon: {
    marginRight: 8,
    marginTop: 2
  },
  ingredientText: {
    fontSize: isMobile ? 15 : 16,
    color: '#555',
    flex: 1
  },
  detailInstructionsContainer: {
    width: '100%',
    padding: isMobile ? 15 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 60,
  },
  detailInstructionsContainerMobile: {
    padding: 15,
  },
  detailInstructionsContainerTablet: {
    padding: 20,
  },
  instructionsText: {
    fontSize: isMobile ? 15 : 16,
    color: '#444',
    lineHeight: isMobile ? 22 : 24
  },
  translateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 10,
    borderRadius: 20,
    marginHorizontal: 15,
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  translateText: {
    marginLeft: 5,
    color: '#007AFF',
    fontWeight: '500',
  },
  mainBackground: { 
    flex: 1,
    width: '100%',
  },
  allRecipesBackground: {
    flex: 1,
    width: '100%',
    minHeight: Dimensions.get('window').height * 2,
  },
  fullscreenBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    padding: isMobile ? 15 : 30,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    minHeight: Dimensions.get('window').height - (Platform.OS === 'ios' ? 100 : 80),
  },
  headerContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: isMobile ? 50 : 30,
    marginBottom: 15,
    maxWidth: 1200,
    alignSelf: 'center',
    display: 'flex',
  },
  appTitle: {
    fontSize: isMobile ? 32 : 40,
    color: '#222',
    marginBottom: 5,
    letterSpacing: 4,
    fontFamily: Platform.select({
      ios: 'Marker Felt',
      android: 'Roboto'
    }),
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
    transform: [{ skewX: '-10deg' }]
  },
  appSubtitle: {
    fontSize: isMobile ? 16 : 20,
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
    paddingTop: 5,
    maxWidth: '80%',
    fontStyle: 'italic',
    letterSpacing: 0.5,
    fontFamily: 'Roboto',
  },
  searchContainer: {
    marginBottom: 15,
    paddingTop: 0,
    paddingBottom: 5,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    marginHorizontal: 20,
    paddingHorizontal: isMobile ? 15 : 80,
  },
  searchContainerMobile: {
    paddingHorizontal: 15,
  },
  searchContainerTablet: {
    paddingHorizontal: 40,
  },
  searchContainerSmall: {
    marginBottom: 15,
    paddingTop: 15,
    paddingBottom: 10,
    paddingHorizontal: isMobile ? 15 : 80,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: isMobile ? 10 : 12,
    width: "125%",
    maxWidth: 600,
    alignSelf: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(27, 25, 25, 0.05)',
  },
  searchHelpText: {
    fontSize: isMobile ? 12 : 13,
    color: '#555',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 5,
    maxWidth: 450,
    alignSelf: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.1,
  },
  searchResultsHeader: {
    marginBottom: 15,
    paddingHorizontal: 12,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  searchResultsTitle: {
    fontSize: isMobile ? 16 : 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  searchedIngredients: {
    fontWeight: '600',
    color: '#3b82f6',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(59, 130, 246, 0.3)',
  },
  resultsCount: {
    fontSize: isMobile ? 13 : 14,
    color: '#555',
    marginBottom: 5,
    fontStyle: 'italic',
  },
  searchIcon: { 
    marginRight: 8,
    color: '#3b82f6',
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: isMobile ? 16 : 18,
    color: "#333",
    paddingVertical: 6,
    fontWeight: '400',
  },
  searchButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 20,
    padding: 8,
    marginLeft: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
  clearButton: {
    padding: 4,
    marginRight: 4,
  },
  suggestionItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  showAllButtonText: {
    color: 'white',
    fontSize: isMobile ? 14 : 16,
    fontWeight: '600',
  },
  flatListContent: {
    flex: 1,
    width: '100%',
  },
  columnWrapper: {
    gap: isMobile ? 10 : 15,
    marginBottom: isMobile ? 10 : 15,
  },
  recipeCard: {
    width: isMobile ? '48%' : isTablet ? '31%' : '23.5%',
    aspectRatio: 1,
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    transform: [{ scale: 1 }],
  },
  recipeCardMobile: {
    width: '48%',
  },
  recipeCardTablet: {
    width: '31%',
  },
  recipeImage: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  imageStyle: {
    borderRadius: 16,
  },
  imageOverlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: isMobile ? 12 : 15,
    paddingVertical: isMobile ? 10 : 12,
    height: 95,
    paddingBottom: 10
  },
  recipeName: {
    fontSize: isMobile ? 16 : 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  recipeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  viewRecipeText: {
    color: 'rgba(255,255,255, 1)',
    fontSize: isMobile ? 13 : 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  noResults: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 18,
    color: "#555",
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 20,
    borderRadius: 12,
    maxWidth: 500,
    alignSelf: 'center',
    shadowColor: "#000",
    shadowOffset: {width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    fontStyle: 'italic',
  },
  heartButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  listContentPadding: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
  detailHeartButton: {
    position: 'absolute',
    right: 15,
    top: Platform.OS === 'ios' ? 50 : 40,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  mealPlanModalContainer: {
    width: isDesktop ? '60%' : isTablet ? '80%' : '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%',
    alignSelf: 'center',
  },
  mealPlanModalContainerMobile: {
    width: '95%',
    padding: 15,
  },
  mealPlanModalContainerTablet: {
    width: '85%',
  },
  mealPlanModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  mealPlanModalTitle: {
    fontSize: isMobile ? 18 : 20,
    fontWeight: 'bold',
    color: '#333',
  },
  mealPlanScrollView: {
    maxHeight: isMobile ? height * 0.5 : height * 0.6,
  },
  dayContainer: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  dayTitle: {
    fontSize: isMobile ? 16 : 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#4CAF50',
  },
  mealsContainer: {
    gap: 10,
  },
  mealItem: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  mealType: {
    fontSize: isMobile ? 13 : 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  mealName: {
    fontSize: isMobile ? 15 : 16,
    color: '#333',
  },
  clickableRecipe: {
    color: '#4CAF50',
    textDecorationLine: 'underline',
  },
  mealPlanNameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    marginVertical: 15,
    fontSize: 16,
  },
  mealPlanButtonsContainer: {
    marginTop: 10,
  },
  mealPlanActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  mealPlanActionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  regenerateButton: {
    backgroundColor: '#FF9800',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  mealPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
});