import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert, StyleSheet, Dimensions, TouchableOpacity, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Solicitar permissão para notificações
Notifications.requestPermissionsAsync();

const Stack = createNativeStackNavigator();

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 3000); // Exibir a splash screen por 3 segundos
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.splashContainer}>
      <Image source={require('./assets/splashscreen.png')} style={styles.splashImage} />
    </View>
  );
};

const HomeScreen = ({ navigation }) => {
  const [productName, setProductName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [products, setProducts] = useState([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const storedProducts = await AsyncStorage.getItem('products');
      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const saveProducts = async (products) => {
    try {
      await AsyncStorage.setItem('products', JSON.stringify(products));
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddProduct = () => {
    if (productName === '' || expiryDate === '' || quantity === '') {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    const formattedExpiryDate = formatExpiryDate(expiryDate);

    const newProduct = { id: Date.now().toString(), name: productName, expiryDate: formattedExpiryDate, quantity: parseInt(quantity) };
    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    saveProducts(updatedProducts);
    setProductName('');
    setExpiryDate('');
    setQuantity('');
  };

  const formatExpiryDate = (date) => {
    const cleanedDate = date.replace(/\D/g, '');
    if (cleanedDate.length === 8) {
      return cleanedDate.replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
    }
    return date;
  };

  const generateReport = async () => {
    const reportData = products.map(product => 
      `Nome: ${product.name}\nData de Validade: ${product.expiryDate}\nQuantidade: ${product.quantity}\nDias p/ vencer: ${daysUntilExpiry(product.expiryDate)}\n`
    ).join('\n');

    const path = `${FileSystem.documentDirectory}report.txt`;

    try {
      await FileSystem.writeAsStringAsync(path, reportData, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path);
    } catch (error) {
      console.error(error);
    }
  };

  const daysUntilExpiry = (expiryDate) => {
    const now = new Date();
    const [day, month, year] = expiryDate.split('/');
    const expiry = new Date(`${year}-${month}-${day}`);
    const diffTime = Math.abs(expiry - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Cadastro de Produtos</Text>
      <TextInput
        placeholder="Nome do Produto"
        value={productName}
        onChangeText={setProductName}
        style={styles.input}
      />
      <TextInput
        placeholder="Data de Validade (DDMMYYYY)"
        value={expiryDate}
        onChangeText={setExpiryDate}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="Quantidade"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
        style={styles.input}
      />
      <Button title="Adicionar Produto" onPress={handleAddProduct} color="#B22222" />
      <TouchableOpacity onPress={() => navigation.navigate('Products', { products, loadProducts, saveProducts })} style={styles.button}>
        <Text style={styles.buttonText}>Ver Produtos Cadastrados</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={generateReport} style={styles.button}>
        <Text style={styles.buttonText}>Gerar Relatório</Text>
      </TouchableOpacity>
    </View>
  );
};

const ProductsScreen = ({ route, navigation }) => {
  const { products: initialProducts, loadProducts, saveProducts } = route.params;
  const [products, setProducts] = useState(initialProducts);

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDeleteProduct = (productId) => {
    const updatedProducts = products.filter(product => product.id !== productId);
    setProducts(updatedProducts);
    saveProducts(updatedProducts);
  };

  const daysUntilExpiry = (expiryDate) => {
    const now = new Date();
    const [day, month, year] = expiryDate.split('/');
    const expiry = new Date(`${year}-${month}-${day}`);
    const diffTime = Math.abs(expiry - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderItem = ({ item }) => (
    <View style={styles.productItem}>
      <View>
        <Text style={styles.productText}>{item.name}</Text>
        <Text style={styles.productText}>{item.expiryDate}</Text>
        <Text style={styles.productText}>{`Qtd: ${item.quantity}`}</Text>
        <Text style={styles.productText}>{`Dias p/ vencer: ${daysUntilExpiry(item.expiryDate)}`}</Text>
      </View>
      <Button title="Excluir" onPress={() => handleDeleteProduct(item.id)} color="#B22222" />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Produtos Cadastrados</Text>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={{ marginTop: 20 }}
      />
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.button}>
        <Text style={styles.buttonText}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );
};

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash">
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: '' }} />
        <Stack.Screen name="Products" component={ProductsScreen} options={{ title: '' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  splashImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  header: {
    fontSize: 24,
    color: '#B22222',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#B22222',
    borderRadius: 5,
    padding: 8,
    marginBottom: 10,
    width: width - 40,
  },
  button: {
    backgroundColor: '#B22222',
    padding: 10,
    marginTop: 20,
    alignItems: 'center',
    borderRadius: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#B22222',
  },
  productText: {
    color: '#000000',
  },
});

export default App;

