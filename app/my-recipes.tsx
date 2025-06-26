import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    ImageBackground,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth } from './firebase';
import { Recipe, recipeImageMap } from './index';

const getRecipeImageSource = (recipe: Recipe) => {
  if (recipe.name && recipeImageMap[recipe.name]) {
    return recipeImageMap[recipe.name];
  }
  else if (recipe.image && typeof recipe.image === 'string' && recipeImageMap[recipe.image]) {
    return recipeImageMap[recipe.image];
  }
  else if (typeof recipe.image === 'number') {
    return recipe.image;
  }
  else if (recipe.image && typeof recipe.image === 'object' && 'uri' in recipe.image) {
    return recipe.image;
  }
  else {
    return require("../assets/images/recipedd.jpg");
  }
};

const { width, height } = Dimensions.get('window');
const isMobile = width < 600;
const isTablet = width >= 600 && width < 1000;

const SAVED_RECIPES_KEY = '@saved_recipes';
const SAVED_MEAL_PLANS_KEY = '@saved_meal_plans';

const albanianDays = {
  Monday: 'E Hënë',
  Tuesday: 'E Martë',
  Wednesday: 'E Mërkurë',
  Thursday: 'E Enjte',
  Friday: 'E Premte',
  Saturday: 'E Shtunë',
  Sunday: 'E Diel'
};

const englishDays = {
  'E Hënë': 'Monday',
  'E Martë': 'Tuesday',
  'E Mërkurë': 'Wednesday',
  'E Enjte': 'Thursday',
  'E Premte': 'Friday',
  'E Shtunë': 'Saturday',
  'E Diel': 'Sunday'
};

export default function MyRecipesScreen() {
    const router = useRouter();
    const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
    const [savedMealPlans, setSavedMealPlans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
    const [viewingMealPlan, setViewingMealPlan] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'recipes' | 'mealPlans'>('recipes');
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    
    // Edit recipe state
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editRecipeName, setEditRecipeName] = useState('');
    const [editRecipeIngredients, setEditRecipeIngredients] = useState('');
    const [editRecipeInstructions, setEditRecipeInstructions] = useState('');
    const [editRecipeImage, setEditRecipeImage] = useState<string | null>(null);
    const [isUpdatingRecipe, setIsUpdatingRecipe] = useState(false);

    const getApiBaseUrl = () => {
        return 'https://reverse-shopping-hiq9.onrender.com';
    };

    const loadSavedData = useCallback(async () => {
        setIsLoading(true);
        setViewingRecipe(null);
        setViewingMealPlan(null);
        
        const currentUser = auth.currentUser;
        if (!currentUser) {
            setSavedRecipes([]);
            setSavedMealPlans([]);
            setIsLoading(false);
            return;
        }
        
        try {
            // Load saved recipes
            const storedRecipes = await AsyncStorage.getItem(`${SAVED_RECIPES_KEY}_${currentUser.uid}`);
            let localRecipes: Recipe[] = [];
            
            if (storedRecipes) {
                const savedRecipesData = JSON.parse(storedRecipes);
                if (savedRecipesData.length > 0 && typeof savedRecipesData[0] === 'object') {
                    localRecipes = savedRecipesData;
                    setSavedRecipes(localRecipes);
                }
            }
            
            // Try to fetch from backend API
            try {
                const response = await axios.get(`${getApiBaseUrl()}/saved-recipes`);
                
                if (response.data && Array.isArray(response.data)) {
                    const validRecipes = response.data.filter((item: any) => {
                        return item && item.name && item.recipeId;
                    });
                    
                    const backendRecipes = validRecipes.map((item: any) => ({
                        id: item.recipeId,
                        _id: item._id,
                        name: item.name,
                        ingredients: item.perberesit || [],
                        instructions: item.instructions,
                        image: getRecipeImageSource({ name: item.name, image: item.image } as Recipe)
                    }));
                    
                    const mergedRecipes = [...backendRecipes];
                    
                    localRecipes.forEach(localRecipe => {
                        if (localRecipe && localRecipe.id && localRecipe.name && 
                            !mergedRecipes.some(r => r.id === localRecipe.id)) {
                            mergedRecipes.push({
                                ...localRecipe,
                                _id: localRecipe._id || localRecipe.id
                            });
                        }
                    });
                    
                    setSavedRecipes(mergedRecipes);
                    if (currentUser) {
                        await AsyncStorage.setItem(`${SAVED_RECIPES_KEY}_${currentUser.uid}`, JSON.stringify(mergedRecipes));
                    }
                }
            } catch (apiError) {
                console.error('Failed to fetch saved recipes from API:', apiError);
            }

            // Load saved meal plans
            const storedMealPlans = await AsyncStorage.getItem(`${SAVED_MEAL_PLANS_KEY}_${currentUser.uid}`);
            if (storedMealPlans) {
                const parsedMealPlans = JSON.parse(storedMealPlans);
                // Convert English day names to Albanian for display
                const validatedMealPlans = parsedMealPlans.map((plan: any) => {
                    const convertedPlan: any = {};
                    if (plan.plan) {
                        Object.keys(plan.plan).forEach(day => {
                            const albanianDay = albanianDays[day as keyof typeof albanianDays] || day;
                            convertedPlan[albanianDay] = plan.plan[day];
                        });
                    }
                    return {
                        ...plan,
                        plan: convertedPlan,
                        name: plan.name || 'Plan i padeklaruar'
                    };
                });
                setSavedMealPlans(validatedMealPlans);
            }

        } catch (e) {
            console.error("Failed to load saved data", e);
            setSavedRecipes([]);
            setSavedMealPlans([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setIsAuthenticated(!!user);
            
            if (!user) {
                setSavedRecipes([]);
                setSavedMealPlans([]);
                
                Alert.alert(
                    'Regjistrohu ose Kyçu', 
                    'Ju lutemi regjistrohuni ose kyçuni për të parë recetat dhe planet e ruajtura.',
                    [
                        { 
                            text: 'Anulo', 
                            style: 'cancel',
                            onPress: () => router.replace('./')
                        },
                        { 
                            text: 'Shko te Kyçja', 
                            onPress: () => router.push('./auth')
                        }
                    ]
                )
            }
        });
        
        return () => unsubscribe();
    }, [router]);
    
    useFocusEffect(
        React.useCallback(() => {
            loadSavedData();
            return () => { };
        }, [loadSavedData])
    );

    const handleUnsaveRecipe = async (recipe: Recipe) => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            Alert.alert('Gabim', 'Ju duhet të jeni të kyçur për të fshirë receta.');
            return;
        }

        Alert.alert(
            'Fshi recetën',
            `A jeni të sigurt që dëshironi të fshini recetën "${recipe.name}"?`,
            [
                { text: 'Anulo', style: 'cancel' },
                {
                    text: 'Fshi',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Remove from local storage
                            const storedRecipes = await AsyncStorage.getItem(`${SAVED_RECIPES_KEY}_${currentUser.uid}`);
                            if (storedRecipes) {
                                const localRecipes = JSON.parse(storedRecipes);
                                const updatedRecipes = localRecipes.filter((r: Recipe) => r.id !== recipe.id);
                                await AsyncStorage.setItem(`${SAVED_RECIPES_KEY}_${currentUser.uid}`, JSON.stringify(updatedRecipes));
                                setSavedRecipes(updatedRecipes);
                            }

                            // Remove from backend if it has a server ID
                            if (recipe._id) {
                                try {
                                    await axios.delete(`${getApiBaseUrl()}/recipes/${recipe._id}`);
                                    console.log('Recipe deleted from server');
                                } catch (error) {
                                    console.error('Failed to delete recipe from server:', error);
                                }
                            }

                            if (viewingRecipe && viewingRecipe.id === recipe.id) {
                                setViewingRecipe(null);
                            }
                        } catch (error) {
                            console.error('Error deleting recipe:', error);
                            Alert.alert('Gabim', 'Ndodhi një gabim gjatë fshirjes së recetës.');
                        }
                    }
                }
            ]
        );
    };

    // Edit recipe functions
    const openEditModal = (recipe: Recipe) => {
        setEditingRecipe(recipe);
        setEditRecipeName(recipe.name);
        setEditRecipeIngredients(recipe.ingredients.join('\n'));
        setEditRecipeInstructions(recipe.instructions);
        setEditRecipeImage(recipe.image && typeof recipe.image === 'string' ? recipe.image : null);
        setEditModalVisible(true);
    };

    const closeEditModal = () => {
        setEditModalVisible(false);
        setEditingRecipe(null);
        setEditRecipeName('');
        setEditRecipeIngredients('');
        setEditRecipeInstructions('');
        setEditRecipeImage(null);
    };

    const pickEditRecipeImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Leje e nevojshme', 'Na duhet leje për të aksesuar galerinë e fotos.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.7,
            });

            if (!result.canceled && result.assets[0]) {
                setEditRecipeImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Gabim', 'Ndodhi një gabim gjatë zgjedhjes së fotos.');
        }
    };

    const uploadEditRecipeImage = async (uri: string): Promise<string> => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            
            const storage = getStorage();
            const imageRef = ref(storage, `recipe-images/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`);
            
            await uploadBytes(imageRef, blob);
            const downloadURL = await getDownloadURL(imageRef);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    };

    const handleUpdateRecipe = async () => {
        if (!editingRecipe) return;

        if (!editRecipeName.trim() || !editRecipeIngredients.trim() || !editRecipeInstructions.trim()) {
            Alert.alert('Gabim', 'Ju lutem plotësoni të gjitha fushat e detyrueshme.');
            return;
        }

        setIsUpdatingRecipe(true);

        try {
            const ingredientsArray = editRecipeIngredients
                .split('\n')
                .map(item => item.trim())
                .filter(item => item.length > 0);

            if (ingredientsArray.length === 0) {
                Alert.alert('Gabim', 'Ju lutem shtoni të paktën një përbërës.');
                setIsUpdatingRecipe(false);
                return;
            }

            let imageUrl = editingRecipe.image;
            
            // Upload new image if selected
            if (editRecipeImage && editRecipeImage !== editingRecipe.image) {
                try {
                    imageUrl = await uploadEditRecipeImage(editRecipeImage);
                } catch (error) {
                    console.error('Error uploading new image:', error);
                    Alert.alert('Vërejtje', 'Fotoja nuk u ngarkua, por receta do të përditësohet.');
                }
            }

            const updatedRecipeData = {
                name: editRecipeName.trim(),
                perberesit: ingredientsArray,
                instructions: editRecipeInstructions.trim(),
                image: imageUrl
            };

            // Update in backend if it has a server ID
            if (editingRecipe._id) {
                try {
                    const response = await axios.patch(`${getApiBaseUrl()}/recipes/${editingRecipe._id}`, updatedRecipeData);
                    console.log('Recipe updated on server:', response.data);
                } catch (error) {
                    console.error('Failed to update recipe on server:', error);
                }
            }

            // Update local state
            const updatedRecipes = savedRecipes.map(recipe => 
                recipe.id === editingRecipe.id 
                    ? { 
                        ...recipe, 
                        name: editRecipeName.trim(),
                        ingredients: ingredientsArray,
                        instructions: editRecipeInstructions.trim(),
                        image: imageUrl
                    }
                    : recipe
            );

            setSavedRecipes(updatedRecipes);
            
            // Update local storage
            const currentUser = auth.currentUser;
            if (currentUser) {
                await AsyncStorage.setItem(`${SAVED_RECIPES_KEY}_${currentUser.uid}`, JSON.stringify(updatedRecipes));
            }

            // Update viewing recipe if it's the same one
            if (viewingRecipe && viewingRecipe.id === editingRecipe.id) {
                setViewingRecipe({
                    ...viewingRecipe,
                    name: editRecipeName.trim(),
                    ingredients: ingredientsArray,
                    instructions: editRecipeInstructions.trim(),
                    image: imageUrl
                });
            }

            closeEditModal();
            Alert.alert('Sukses', 'Receta u përditësua me sukses!');
        } catch (error) {
            console.error('Error updating recipe:', error);
            Alert.alert('Gabim', 'Ndodhi një gabim gjatë përditësimit të recetës.');
        } finally {
            setIsUpdatingRecipe(false);
        }
    };

    const handleUnsaveMealPlan = async (mealPlanId: string) => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;
            
            const storageKey = `${SAVED_MEAL_PLANS_KEY}_${currentUser.uid}`;
            const storedValue = await AsyncStorage.getItem(storageKey);
            let savedMealPlansData = storedValue ? JSON.parse(storedValue) : [];

            const updatedMealPlans = savedMealPlansData.filter((mp: any) => mp.id !== mealPlanId);
            setSavedMealPlans(updatedMealPlans);

            await AsyncStorage.setItem(storageKey, JSON.stringify(updatedMealPlans));
            
            Alert.alert('Sukses', 'Plani u hoq');
        } catch (e) {
            console.error("Failed to unsave meal plan", e);
            Alert.alert('Gabim', 'Ndodhi një gabim gjatë heqjes së planit');
            loadSavedData();
        }
    };

    const handleGoBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('./');
        }
    };

    const handleShowRecipeDetails = (recipe: Recipe) => {
        setViewingRecipe(recipe);
        setViewingMealPlan(null);
    };

    const handleShowMealPlanDetails = (mealPlan: any) => {
        setViewingMealPlan(mealPlan);
        setViewingRecipe(null);
    };

    const handleBackToList = () => {
        setViewingRecipe(null);
        setViewingMealPlan(null);
    };

    const renderMealPlanCard = (mealPlan: any) => (
        <TouchableOpacity
            style={[styles.mealPlanCard, isTablet && styles.mealPlanCardTablet]}
            onPress={() => handleShowMealPlanDetails(mealPlan)}
            activeOpacity={0.8}
        >
            <ImageBackground
                source={require("../assets/images/recipedd.jpg")}
                style={styles.mealPlanImage}
                imageStyle={styles.imageStyle}
            >
                <TouchableOpacity
                    style={styles.heartButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        handleUnsaveMealPlan(mealPlan.id);
                    }}
                >
                    <Ionicons name="trash-outline" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.imageOverlay}>
                    <Text style={styles.mealPlanName} numberOfLines={2}>{mealPlan.name}</Text>
                    <View style={styles.recipeFooter}>
                        <Text style={styles.viewRecipeText}>Shiko planin</Text>
                        <Ionicons name="arrow-forward" size={16} color="white" />
                    </View>
                </View>
            </ImageBackground>
        </TouchableOpacity>
    );

    const renderMealPlanDetail = () => {
        if (!viewingMealPlan) return null;
        
        const days = Object.keys(viewingMealPlan.plan || {});
        
        return (
            <ScrollView style={styles.detailScrollContainer} contentContainerStyle={styles.scrollContentContainer}>
                <View style={styles.detailHeaderContainer}>
                    <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.detailTitle} numberOfLines={1} ellipsizeMode='tail'>
                        {viewingMealPlan.name}
                    </Text>
                    <TouchableOpacity
                        onPress={() => handleUnsaveMealPlan(viewingMealPlan.id)}
                        style={styles.detailHeartButton}
                    >
                        <Ionicons name="trash-outline" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                <View style={styles.mealPlanDetailContainer}>
                    {days.map(day => (
                        <View key={day} style={styles.mealPlanDayContainer}>
                            <Text style={styles.mealPlanDayTitle}>{day}</Text>
                            
                            {viewingMealPlan.plan[day]?.breakfast && (
                                <TouchableOpacity 
                                    style={styles.mealPlanMealItem}
                                    onPress={() => handleShowRecipeDetails(viewingMealPlan.plan[day].breakfast)}
                                >
                                    <Text style={styles.mealPlanMealType}>Mëngjesi:</Text>
                                    <Text style={styles.mealPlanMealName}>{viewingMealPlan.plan[day].breakfast.name}</Text>
                                </TouchableOpacity>
                            )}
                            
                            {viewingMealPlan.plan[day]?.lunch && (
                                <TouchableOpacity 
                                    style={styles.mealPlanMealItem}
                                    onPress={() => handleShowRecipeDetails(viewingMealPlan.plan[day].lunch)}
                                >
                                    <Text style={styles.mealPlanMealType}>Dreka:</Text>
                                    <Text style={styles.mealPlanMealName}>{viewingMealPlan.plan[day].lunch.name}</Text>
                                </TouchableOpacity>
                            )}
                            
                            {viewingMealPlan.plan[day]?.dinner && (
                                <TouchableOpacity 
                                    style={styles.mealPlanMealItem}
                                    onPress={() => handleShowRecipeDetails(viewingMealPlan.plan[day].dinner)}
                                >
                                    <Text style={styles.mealPlanMealType}>Darka:</Text>
                                    <Text style={styles.mealPlanMealName}>{viewingMealPlan.plan[day].dinner.name}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                </View>
            </ScrollView>
        );
    };

    if (isLoading) {
        return (
            <ImageBackground source={require("../assets/images/back.jpg")} style={styles.background} resizeMode="cover">
                <View style={styles.backgroundOverlay} />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Duke ngarkuar të dhënat...</Text>
                </View>
            </ImageBackground>
        );
    }

    return (
        <ImageBackground
            source={require("../assets/images/recipedd.jpg")}
            style={styles.background}
            resizeMode="cover"
        >
            <View style={styles.backgroundOverlay} />

            {viewingRecipe ? (
                <ScrollView style={styles.detailScrollContainer} contentContainerStyle={styles.scrollContentContainer}>
                    <View style={styles.detailHeaderContainer}>
                        <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.detailTitle} numberOfLines={1} ellipsizeMode='tail'>
                            {viewingRecipe.name}
                        </Text>
                        <View style={styles.detailActionButtons}>
                            <TouchableOpacity
                                onPress={() => openEditModal(viewingRecipe)}
                                style={styles.editButton}
                            >
                                <Ionicons name="create-outline" size={24} color="#007AFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleUnsaveRecipe(viewingRecipe)}
                                style={styles.deleteButton}
                            >
                                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.detailContentWrapper}>
                        <View style={styles.detailTopRowContainer}>
                            <View style={[styles.detailImageContainer, isTablet && styles.detailImageContainerTablet]}>
                                <Image
                                    source={getRecipeImageSource(viewingRecipe)}
                                    style={styles.detailImage}
                                    resizeMode="cover"
                                />
                            </View>
                            <View style={[styles.detailIngredientsContainer, isTablet && styles.detailIngredientsContainerTablet]}>
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Përbërësit</Text>
                                    {viewingRecipe.ingredients.map((ingredient, index) => (
                                        <View key={index} style={styles.ingredientItem}>
                                            <Ionicons name="ellipse" size={8} color="#007AFF" style={styles.ingredientIcon} />
                                            <Text style={styles.ingredientText}>{ingredient}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>

                        <View style={styles.detailInstructionsContainer}>
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Udhëzimet</Text>
                                <Text style={styles.instructionsText}>
                                    {viewingRecipe.instructions}
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            ) : viewingMealPlan ? (
                renderMealPlanDetail()
            ) : (
                <ScrollView style={styles.listScrollContainer} contentContainerStyle={styles.scrollContentContainer}>
                    <View style={styles.container}>
                        <View style={styles.detailHeaderContainer}>
                            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#333" />
                            </TouchableOpacity>
                            <Text style={styles.detailTitle} numberOfLines={1} ellipsizeMode='tail'>
                                Recetat e mia
                            </Text>
                            <View style={styles.headerPlaceholderRight} />
                        </View>

                        <View style={styles.tabContainer}>
                            <TouchableOpacity 
                                style={[styles.tabButton, activeTab === 'recipes' && styles.activeTab]}
                                onPress={() => setActiveTab('recipes')}
                            >
                                <Text style={[styles.tabText, activeTab === 'recipes' && styles.activeTabText]}>Recetat</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.tabButton, activeTab === 'mealPlans' && styles.activeTab]}
                                onPress={() => setActiveTab('mealPlans')}
                            >
                                <Text style={[styles.tabText, activeTab === 'mealPlans' && styles.activeTabText]}>Planet</Text>
                            </TouchableOpacity>
                        </View>

                        {activeTab === 'recipes' ? (
                            savedRecipes.length === 0 ? (
                                <View style={styles.centeredEmpty}>
                                    <Ionicons name="archive-outline" size={60} color="#ccc" />
                                    <Text style={styles.noRecipesText}>Nuk keni receta të ruajtura</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={savedRecipes}
                                    keyExtractor={(item) => item.id}
                                    numColumns={isMobile ? 2 : (isTablet ? 3 : 4)}
                                    columnWrapperStyle={isMobile ? styles.columnWrapperMobile : (isTablet ? styles.columnWrapperTablet : styles.columnWrapper)}
                                    style={styles.flatListStyle}
                                    contentContainerStyle={styles.listContainerPadding}
                                    scrollEnabled={false}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[styles.recipeCard, isTablet && styles.recipeCardTablet]}
                                            onPress={() => handleShowRecipeDetails(item)}
                                            activeOpacity={0.8}
                                        >
                                            <ImageBackground
                                                source={getRecipeImageSource(item)}
                                                style={styles.recipeImage}
                                                imageStyle={styles.imageStyle}
                                            >
                                                <View style={styles.recipeCardActions}>
                                                    <TouchableOpacity
                                                        style={styles.cardEditButton}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            openEditModal(item);
                                                        }}
                                                    >
                                                        <Ionicons name="create-outline" size={20} color="#007AFF" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={styles.cardDeleteButton}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            handleUnsaveRecipe(item);
                                                        }}
                                                    >
                                                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                                    </TouchableOpacity>
                                                </View>
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
                                    key={isMobile ? 'mobile-columns' : (isTablet ? 'tablet-columns' : 'desktop-columns')}
                                />
                            )
                        ) : (
                            savedMealPlans.length === 0 ? (
                                <View style={styles.centeredEmpty}>
                                    <Ionicons name="calendar-outline" size={60} color="#ccc" />
                                    <Text style={styles.noRecipesText}>Nuk keni plane të ruajtura</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={savedMealPlans}
                                    keyExtractor={(item) => item.id}
                                    numColumns={isMobile ? 1 : (isTablet ? 2 : 2)}
                                    columnWrapperStyle={isMobile ? undefined : (isTablet ? styles.columnWrapperTablet : styles.columnWrapper)}
                                    style={styles.flatListStyle}
                                    contentContainerStyle={styles.listContainerPadding}
                                    scrollEnabled={false}
                                    renderItem={({ item }) => renderMealPlanCard(item)}
                                />
                            )
                        )}
                    </View>
                </ScrollView>
            )}
            
            {/* Edit Recipe Modal */}
            <Modal
                visible={editModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={closeEditModal}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={closeEditModal} style={styles.modalCloseButton}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Përditëso Recetën</Text>
                        <View style={styles.modalPlaceholder} />
                    </View>

                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.formSection}>
                            <Text style={styles.inputLabel}>Emri i Recetës<Text style={styles.requiredStar}>*</Text></Text>
                            <TextInput
                                placeholder="Shkruani emrin e recetës"
                                style={styles.input}
                                value={editRecipeName}
                                onChangeText={setEditRecipeName}
                                maxLength={50}
                            />
                            <Text style={styles.characterCount}>{editRecipeName.length}/50</Text>
                        </View>

                        <View style={styles.formSection}>
                            <Text style={styles.inputLabel}>Përbërësit<Text style={styles.requiredStar}>*</Text></Text>
                            <Text style={styles.inputHelper}>Shkruani çdo përbërës në një rresht të ri</Text>
                            <TextInput
                                placeholder="P.sh.\n2 vezë\n100g miell\n50ml qumësht\n..."
                                style={[styles.input, styles.recipeTextArea]}
                                value={editRecipeIngredients}
                                onChangeText={setEditRecipeIngredients}
                                multiline
                                numberOfLines={5}
                                textAlignVertical="top"
                            />
                            {editRecipeIngredients.trim() ? (
                                <Text style={styles.ingredientCount}>
                                    {editRecipeIngredients.split('\n').filter(line => line.trim().length > 0).length} përbërës
                                </Text>
                            ) : null}
                        </View>

                        <View style={styles.formSection}>
                            <Text style={styles.inputLabel}>Udhëzimet<Text style={styles.requiredStar}>*</Text></Text>
                            <Text style={styles.inputHelper}>Përshkruani hapat e përgatitjes së recetës</Text>
                            <TextInput
                                placeholder="Përshkruani procesin e përgatitjes hap pas hapi..."
                                style={[styles.input, styles.recipeTextArea, styles.instructionsArea]}
                                value={editRecipeInstructions}
                                onChangeText={setEditRecipeInstructions}
                                multiline
                                numberOfLines={8}
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={styles.formSection}>
                            <Text style={styles.inputLabel}>Foto e Recetës</Text>
                            <Text style={styles.inputHelper}>Shtoni një foto të gatimit përfundimtar (opsionale)</Text>

                            <TouchableOpacity
                                style={styles.uploadPhotoButton}
                                onPress={pickEditRecipeImage}
                            >
                                <Ionicons name="camera" size={20} color="#fff" />
                                <Text style={styles.uploadPhotoText}>Ngarko foto të recetës</Text>
                            </TouchableOpacity>

                            {editRecipeImage ? (
                                <View style={styles.uploadedImageContainer}>
                                    <Image source={{ uri: editRecipeImage }} style={styles.recipePreviewImage} />
                                    <TouchableOpacity
                                        style={styles.removeImageButton}
                                        onPress={() => setEditRecipeImage(null)}
                                    >
                                        <Ionicons name="close-circle" size={24} color="#FF3B30" />
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={[styles.updateButton, isUpdatingRecipe && styles.updateButtonDisabled]}
                            onPress={handleUpdateRecipe}
                            disabled={isUpdatingRecipe}
                        >
                            {isUpdatingRecipe ? (
                                <View style={styles.saveButtonContent}>
                                    <ActivityIndicator size="small" color="#fff" />
                                    <Text style={[styles.updateButtonText, styles.savingText]}>Duke përditësuar...</Text>
                                </View>
                            ) : (
                                <Text style={styles.updateButtonText}>Përditëso Recetën</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1, width: "100%" },
    backgroundOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: {
        marginTop: 15, fontSize: 16, color: '#333', backgroundColor: 'rgba(255,255,255,0.7)',
        paddingVertical: 5, paddingHorizontal: 10, borderRadius: 5,
    },
    centeredEmpty: {
        flex: 1, width: '100%', paddingVertical: 80, alignItems: 'center', justifyContent: 'center',
        minHeight: height * 0.5,
    },
    noRecipesText: {
        fontSize: 18, color: '#444', textAlign: 'center', marginTop: 15,
        backgroundColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5,
    },
    listScrollContainer: { flex: 1 },
    detailScrollContainer: { flex: 1 },
    scrollContentContainer: { paddingBottom: 40, flexGrow: 1 },
    container: {
        flex: 1,
        paddingHorizontal: isMobile ? 15 : (isTablet ? 20 : 30),
        paddingTop: 0,
        maxWidth: 1300,
        alignSelf: 'center',
        width: '100%',
        alignItems: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        width: '100%',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 10,
        padding: 5,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#007AFF',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#555',
    },
    activeTabText: {
        color: 'white',
    },
    mealPlanCard: {
        width: isMobile ? '100%' : '48%',
        aspectRatio: 2,
        backgroundColor: "white",
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: isMobile ? 10 : 15,
    },
    mealPlanCardTablet: {
        width: '48%',
        aspectRatio: 2.5,
    },
    mealPlanImage: {
        flex: 1,
        justifyContent: 'flex-end',
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    mealPlanDetailContainer: {
        paddingHorizontal: isMobile ? 15 : (isTablet ? 20 : 25),
        maxWidth: 1100,
        width: '100%',
        alignSelf: 'center',
    },
    mealPlanDayContainer: {
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 12,
        padding: isMobile ? 12 : (isTablet ? 15 : 15),
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    mealPlanDayTitle: {
        fontSize: isMobile ? 16 : (isTablet ? 17 : 18),
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingBottom: 5,
    },
    mealPlanMealItem: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: 'rgba(240,240,240,0.8)',
        borderRadius: 8,
        marginBottom: 8,
    },
    mealPlanMealType: {
        fontSize: isMobile ? 13 : (isTablet ? 14 : 14),
        fontWeight: '600',
        color: '#555',
    },
    mealPlanMealName: {
        fontSize: isMobile ? 15 : (isTablet ? 16 : 16),
        color: '#333',
        marginTop: 4,
    },
    mealPlanName: {
        fontSize: isMobile ? 16 : (isTablet ? 17 : 18),
        fontWeight: "bold",
        color: "white",
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    detailContentWrapper: {
        paddingHorizontal: isMobile ? 15 : (isTablet ? 20 : 25),
        maxWidth: 1100,
        width: '100%',
        alignSelf: 'center',
    },
    detailHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
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
        fontSize: isMobile ? 20 : (isTablet ? 22 : 24),
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginHorizontal: 10,
    },
    detailHeartButton: {
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
    headerPlaceholderRight: {
        width: 36,
        height: 36,
    },
    detailTopRowContainer: {
        flexDirection: isMobile ? 'column' : 'row',
        width: '100%',
        marginBottom: 20,
        gap: isMobile ? 15 : (isTablet ? 15 : 20),
        alignItems: 'center',
    },
    detailImageContainer: {
        width: isMobile ? '80%' : (isTablet ? '45%' : '40%'),
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
    detailImageContainerTablet: {
        width: '45%',
        borderRadius: 200,
    },
    detailImage: {
        width: '100%',
        height: '100%',
        borderRadius: 240,
    },
    detailIngredientsContainer: {
        width: isMobile ? '100%' : (isTablet ? '50%' : '55%'),
        padding: isMobile ? 15 : (isTablet ? 15 : 20),
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    detailIngredientsContainerTablet: {
        width: '50%',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: isMobile ? 18 : (isTablet ? 19 : 20),
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
        fontSize: isMobile ? 15 : (isTablet ? 15 : 16),
        color: '#555',
        flex: 1
    },
    detailInstructionsContainer: {
        width: '100%',
        padding: isMobile ? 15 : (isTablet ? 15 : 20),
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        marginBottom: 60,
    },
    instructionsText: {
        fontSize: isMobile ? 15 : (isTablet ? 15 : 16),
        color: '#444',
        lineHeight: isMobile ? 22 : (isTablet ? 22 : 24)
    },
    flatListStyle: {
        alignSelf: 'center',
        paddingHorizontal: 5,
        width: '100%',
    },
    listContainerPadding: {
        paddingBottom: 0
    },
    columnWrapper: {
        gap: 15,
        marginBottom: 15,
    },
    columnWrapperTablet: {
        gap: 12,
        marginBottom: 12,
    },
    columnWrapperMobile: {
        gap: 10,
        marginBottom: 10,
    },
    recipeCard: {
        width: isMobile ? '48%' : (isTablet ? '31%' : '23.5%'),
        aspectRatio: 1,
        backgroundColor: "white",
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
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
    },
    imageStyle: {
        borderRadius: 12,
    },
    imageOverlay: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: isMobile ? 10 : (isTablet ? 10 : 12),
        paddingVertical: isMobile ? 8 : (isTablet ? 8 : 10),
        height: 90,
        paddingBottom: 8
    },
    recipeName: {
        fontSize: isMobile ? 15 : (isTablet ? 16 : 17),
        fontWeight: "bold",
        color: "white",
        marginBottom: 8,
    },
    recipeFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    viewRecipeText: {
        color: 'rgba(255,255,255, 0.9)',
        fontSize: isMobile ? 13 : (isTablet ? 13 : 14),
        fontWeight: '500',
    },
    heartButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20,
        padding: 6,
        zIndex: 10,
    },
    detailActionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    editButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 25,
        padding: 12,
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    deleteButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 25,
        padding: 12,
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'white',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
    },
    modalCloseButton: {
        padding: 8,
    },
    modalTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalPlaceholder: {
        width: 36,
        height: 36,
    },
    modalContent: {
        padding: 15,
    },
    formSection: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
    },
    requiredStar: {
        color: 'red',
    },
    inputHelper: {
        fontSize: 14,
        color: '#555',
    },
    recipeTextArea: {
        height: 100,
    },
    instructionsArea: {
        height: 200,
    },
    characterCount: {
        fontSize: 14,
        color: '#555',
        textAlign: 'right',
    },
    ingredientCount: {
        fontSize: 14,
        color: '#555',
        textAlign: 'right',
    },
    uploadPhotoButton: {
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#007AFF',
        alignItems: 'center',
    },
    uploadPhotoText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    uploadedImageContainer: {
        marginBottom: 10,
    },
    recipePreviewImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
    },
    removeImageButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20,
        padding: 6,
    },
    modalFooter: {
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        alignItems: 'center',
    },
    updateButton: {
        padding: 12,
        backgroundColor: '#007AFF',
        borderRadius: 8,
        alignItems: 'center',
    },
    updateButtonDisabled: {
        backgroundColor: '#ddd',
    },
    saveButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    updateButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    savingText: {
        color: '#555',
    },
    recipeCardActions: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        zIndex: 20,
    },
    cardEditButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        padding: 8,
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    cardDeleteButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        padding: 8,
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
});