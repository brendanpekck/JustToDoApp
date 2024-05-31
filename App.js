import React, {useEffect, useState} from "react";
import { StyleSheet, Text, View, ScrollView, StatusBar, TouchableOpacity, TextInput, BackHandler } from "react-native";
import { NavigationContainer, useIsFocused } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import VectorIcons from "react-native-vector-icons/FontAwesome";
import Modal from "react-native-modal";;
import { SHA256 } from "crypto-es/lib/sha256";
import * as SQLite from "expo-sqlite";

//local storage imports
/*
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store'
*/

//stack navigation
const Stack = createNativeStackNavigator();
//bottom tab navigation
const Tab = createBottomTabNavigator();
//store user id
let userID = 0;
//store username
let userName = "";
//sign in "token"
let signedIn = false;
//track finished task
let finishedTask = 0;
//track pending task
let pendingTask = 0;
//tasks count update switch
let taskUpdate = false;
//list update switch
let listUpdate = false;

//database
function openDatabase() {
  const db = SQLite.openDatabase("karuna.db");
  return db;
}
const db = openDatabase();

//home screen/list of todo items
function HomeScreen() {
  //add todo item pop up
  const [addModal, setAddModal] = useState(false);
  //edit todo item pop up
  const [editModal, setEditModal] = useState(false);
  //store item id to be edited
  const [editKey, setEditKey] = useState("");
  //individual todo items
  const [taskItem, setTaskItem] = useState("");
  //list of all todo items
  const [taskList, setTaskList] = useState([]);
  //list of all completed todo items
  const [completeList, setCompleteList] = useState([]);
  //submit button state
  const [disabled, setDisabled] = useState(true);
  //screen update switch
  const [updateSwitch, setUpdateSwitch] = useState(false);

  //local storage
  /*
  //add todo item to todo list
  const storeData = async (value) => {
    try {
      await AsyncStorage.setItem("tasky", JSON.stringify([...taskList, value]));
      setTaskList([...taskList, value]);
      setTaskItem("");
      pendingTask++;
    } catch (e) {
      console.log(error);
    }
  }

  //"remove" individual item from list of todo items
  const removeData = async (key) => {
    try {
      const deleteItem = taskList.filter(item => item.id != key);
      setTaskList(deleteItem);
      await AsyncStorage.setItem("tasky", JSON.stringify(deleteItem));
      pendingTask--;
    } catch (e) {
      console.log(error);
    }
  }

  //"edit" individual item from list of todo items
  const editData = async (key, value) => {
    try {
      const deletedItem = taskList.filter(item => item.id != key);
      const replaceItem = [...deletedItem.slice(0, key), {id: key, item: value}, ...deletedItem.slice(key)];
      setTaskList(replaceItem);
      await AsyncStorage.setItem("tasky", JSON.stringify(replaceItem));
    } catch (e) {
      console.log(error);
    }
  }

  //mark individual item from list of todo items as complete
  const completedTask = async (value) => {
    try {
      removeData(value.id);
      await AsyncStorage.setItem("compl", JSON.stringify([...completeList, value]));
      setCompleteList([...completeList, value]);
      finishedTask++;
    } catch (e) {
      console.log(error);
    }
  }

  //remove completed invidual items from list of completed todo items
  const removeComplete = async (key) => {
    try {
      const deleteItem = completeList.filter(item => item.id != key);
      setCompleteList(deleteItem);
      await AsyncStorage.setItem("compl", JSON.stringify(deleteItem));
      finishedTask--;
    } catch (e) {
      console.log(error);
    }
  }
  */
  
  //create items table
  useEffect(() => {
    db.transaction(
      (tx) => {
        tx.executeSql("CREATE TABLE IF NOT EXISTS items (item_id INTEGER PRIMARY KEY, user_id INTEGER, item VARCHAR, status TEXT)", [], (txObj, { rows }) => {
        }, (txObj, error) => {
          console.log(error);
        });
      }
    );

    //check for persistent list
    checkList();

    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => backHandler.remove();
  }, [])

  //disable submit button when input is empty
  useEffect(() => {
    if (taskItem != "") {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
  }, [taskItem]);

  //switch for state
  const isFocused = useIsFocused();
  isFocused? listUpdate = !listUpdate : null;

  useEffect(() => {
  }, [listUpdate]);

  //get list of incomplete tasks created by the user
  const getIncomplete = () => {
    db.transaction(
      (tx) => {
        tx.executeSql("SELECT * FROM items WHERE user_id = ? AND status = ?", [userID, "incomplete"], (txObj, { rows }) => {
          setTaskList(rows._array);
        }, (txObj, error) => {
          console.log(error);
        });
      }
    );
  }

  //get list of complete task created by the user
  const getComplete = () => {
    db.transaction(
      (tx) => {
        tx.executeSql("SELECT * FROM items WHERE user_id = ? AND status = ?", [userID, "complete"], (txObj, { rows }) => {
          setCompleteList(rows._array);
        }, (txObj, error) => {
          console.log(error);
        });
      }
    );
  }

  //add tasks to todo list
  const addItem = () => {
    db.transaction(
      (tx) => {
        tx.executeSql("INSERT INTO items (user_id, item, status) VALUES (?, ?, ?)", [userID, taskItem, "incomplete"], (txObj, { rows }) => { 
          getIncomplete();
          setTaskItem("");
          pendingTask++;
          tx.executeSql("UPDATE users SET utask = ? WHERE user_id = ?", [pendingTask, userID], (txObj, { rows }) => {
          }, (txObj, error) => {
            console.log(error);
          });
          setUpdateSwitch(!updateSwitch);
        }, (txObj, error) => {
          console.log(error);
        });
      }
    );
  }

  //remove task from todo list
  const removeItem = (key) => {
    db.transaction(
      (tx) => {
        tx.executeSql("DELETE FROM items WHERE item_id = ?", [key], (txObj, { rows }) => {
          getIncomplete();
          pendingTask--;
          tx.executeSql("UPDATE users SET utask = ? WHERE user_id = ?", [pendingTask, userID], (txObj, { rows }) => {
          }, (txObj, error) => {
            console.log(error);
          });
          setUpdateSwitch(!updateSwitch);
        }, (txObj, error) => {
          console.log(error);
        });
      }
    );
  }

  //remove task from todo list
  const removeComplete = (key) => {
    db.transaction(
      (tx) => {
        tx.executeSql("DELETE FROM items WHERE item_id = ?", [key], (txObj, { rows }) => {
          getComplete();
          finishedTask--;
          tx.executeSql("UPDATE users SET ftask = ? WHERE user_id = ?", [finishedTask, userID], (txObj, { rows }) => {
          }, (txObj, error) => {
            console.log(error);
          });
          setUpdateSwitch(!updateSwitch);
        }, (txObj, error) => {
          console.log(error);
        });
      }
    );
  }

  //edit tasks
  const editItem = (value, key) => {
    db.transaction(
      (tx) => {
        tx.executeSql("UPDATE items SET item = ? WHERE item_id = ?", [value, key], (txObj, { rows }) => {
          getIncomplete();
          setTaskItem("");
          setUpdateSwitch(!updateSwitch);
        }, (txObj, error) => {
          console.log(error);
        });
      }
    );
  }

  //complete task
  const completeItem = (key) => {
    db.transaction(
      (tx) => {
        tx.executeSql("UPDATE items SET status = ? WHERE item_id = ?", ["complete", key], (txObj, { rows }) => {
          getIncomplete();
          getComplete();
          pendingTask--;
          finishedTask++;
          tx.executeSql("UPDATE users SET utask = ? WHERE user_id = ?", [pendingTask, userID], (txObj, { rows }) => {
          }, (txObj, error) => {
            console.log(error);
          });
          tx.executeSql("UPDATE users SET ftask = ? WHERE user_id = ?", [finishedTask, userID], (txObj, { rows }) => {
          }, (txObj, error) => {
            console.log(error);
          });
          setUpdateSwitch(!updateSwitch);
        }, (txObj, error) => {
          console.log(error);
        });
      }
    );
  }

  //check stored list
  const checkList = () => {
    db.transaction(
      (tx) => {
        tx.executeSql("SELECT * FROM items WHERE user_id = ?", [userID], (txObj, { rows }) => {
          if (rows.length > 0) {
            getIncomplete();
            getComplete();
          }
        }, (txObj, error) => {
            console.log(error);
        });
      }
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.basic} keyboardShouldPersistTaps="handled">
      <View style={styles.mainHeader}>
        <View style={styles.taskHeader}>
            <Text style={styles.smallerHeader}>Tasks</Text>
        </View>
        {/* button for user input pop up */}
        <View style={styles.headerButton}>
          <TouchableOpacity style={styles.taskButton} onPress={() => setAddModal(true)}>
              <VectorIcons name="plus-circle" color="#2F2F2F" size={35}/>
          </TouchableOpacity>
        </View>
      </View>
      {/* render out all todo items */}
      {taskList.map((item) => (
        <View key={item.item_id} style={styles.listItem}>
          <Text style={styles.textSize}>{item.item}</Text>
          {/* remove todo item */}
          <View style={styles.inlineTask}>
            {/* edit todo item */}
            <TouchableOpacity style={styles.inlineButton} onPress={() => {setEditKey(item.item_id); setEditModal(true)}}>
                <VectorIcons name="edit" color="#2F2F2F" size={30}/>
            </TouchableOpacity>
            {/* mark todo item complete */}
            <TouchableOpacity style={styles.inlineButton} onPress={() => {completeItem(item.item_id)}}>
                <VectorIcons name="check" color="#2F2F2F" size={34}/>
            </TouchableOpacity>
            {/* delete todo item */}
            <TouchableOpacity style={styles.inlineButton} onPress={() => {removeItem(item.item_id)}}>
                <VectorIcons name="remove" color="#2F2F2F" size={35}/>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      {/* pop up for user input to add to list of todo items */}
      <View>
        <Modal isVisible={addModal} onBackButtonPress={() => {setAddModal(false); setTaskItem("")}} onBackdropPress={() => {setAddModal(false); setTaskItem("")}}>
          <View style={styles.generalModal}>
            {/* arrange input box and submit button next to each other */}
            <View style={styles.inlineTogether}>
              {/* take in user input */}
              <View style={styles.lineText}>
                <TextInput placeholder="Add new task" defaultValue={taskItem} onChangeText={newItem => setTaskItem(newItem)} style={styles.inputSize} maxLength={50}/>
              </View>
              {/* submit user input */}
              <View style={styles.lineButton}>
                <TouchableOpacity disabled={disabled} style={disabled? styles.disabledButton : styles.enabledButton} onPress={() => {addItem(); setAddModal(false)}}>
                  <VectorIcons name="arrow-circle-up" color="#2F2F2F" size={40}/>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
      {/* pop up for user input to edit list of todo items */}
      <View>
        <Modal isVisible={editModal} onBackButtonPress={() => {setEditModal(false); setTaskItem("")}} onBackdropPress={() => {setEditModal(false); setTaskItem("")}}>
          <View style={styles.generalModal}>
            {/* arrange input box and submit button next to each other */}
            <View style={styles.inlineTogether}>
              {/* take in user input */}
              <View style={styles.lineText}>
                <TextInput placeholder="Edit task" defaultValue={taskItem} onChangeText={newItem => setTaskItem(newItem)} style={styles.inputSize} maxLength={50}/>
              </View>
              {/* submit user input */}
              <View style={styles.lineButton}>
                <TouchableOpacity disabled={disabled} style={disabled? styles.disabledButton : styles.enabledButton} onPress={() => {editItem(taskItem, editKey); setEditModal(false)}}>
                    <VectorIcons name="arrow-circle-up" color="#2F2F2F" size={40}/>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
      {/* render out all completed todo items */}
      {completeList.length > 0 ? <View style={styles.textHeader}><Text style={styles.smallerHeader}>Completed Tasks</Text></View> : null }
      {completeList.map((item) => (
        <View key={item.item_id} style={styles.listItem}>
          <Text style={styles.textSize}>{item.item}</Text>
          <View style={styles.inlineTask}>
            {/* remove completed todo item */}
            <TouchableOpacity style={styles.inlineButton} onPress={() => {removeComplete(item.item_id)}}>
                <VectorIcons name="remove" color="#2F2F2F" size={35}/>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

//user account details screen
function AccountScreen({ navigation }) {
  //modal pop for new username input
  const [usernameModal, setUsernameModal] = useState(false);
  //modal pop for new password input
  const [passwordModal, setPasswordModal] = useState(false);
  //store new username
  const [newUsername, setNewUsername] = useState("");
  //store new password
  const [newPassword, setNewPassword] = useState("");
  //new username submit button state
  const [usernameDisabled, setUsernameDisabled] = useState(true);
  //new password submit button state
  const [passwordDisabled, setPasswordDisabled] = useState(true);
  //duplicate name
  const [duplicateName, setDuplicateName] = useState(false);
  //whitespaces in username
  const [nameSpace, setNameSpace] = useState(false);
  //password length
  const [shortPass, setShortPass] = useState(false);
  //whitespaces in password
  const [passSpace, setPassSpace] = useState(false);
  
  //sign out and unassign user details
  const signOut = () => {
    userID = -1;
    userName = "";
    finishedTask = 0;
    pendingTask = 0;
    signedIn = false;
    navigation.replace("SignIn");
  }

  //disable submit button when username input is empty
  useEffect(() => {
    if (newUsername != "") {
      setUsernameDisabled(false);
    } else {
      setUsernameDisabled(true);
    }
  }, [newUsername]);


  //disable submit button when password input is empty
  useEffect(() => {
    if (newPassword != "") {
      setPasswordDisabled(false);
    } else {
      setPasswordDisabled(true);
    }
  }, [newPassword]);

  //reset warning text
  useEffect(() => {
    setDuplicateName(false);
    setNameSpace(false);
  }, [newUsername]);

  //reset warning text
  useEffect(() => {
    setShortPass(false);
    setPassSpace(false);
  }, [newPassword]);

  //switch for state
  const isFocused = useIsFocused();
  isFocused? taskUpdate = !taskUpdate : null;

  //check for changes in stats
  useEffect(() => {
  }, [taskUpdate]);

  //prevent going back to previous screen
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => backHandler.remove();
  }, [])

  //change username
  const changeName = () => {
    db.transaction(
      (tx) => {
        tx.executeSql("SELECT * FROM users WHERE uname = ?", [newUsername.toLowerCase()], (txObj, { rows }) => {
          if (rows.length == 0 && newUsername.indexOf(" ") == -1) {
            setDuplicateName(false);
            setNameSpace(false);
            tx.executeSql("UPDATE users SET dname = ?, uname = ? WHERE user_id = ?", [newUsername, newUsername.toLowerCase(), userID], (txObj, { rows }) => {
              setUsernameModal(false);
              signOut();
            }, (txObj, error) => {
              console.log(error);
            });
          } else {
            if (rows.length > 0) {
              setDuplicateName(true);
            }
            if (newUsername.indexOf(" ") >= 0) {
              setNameSpace(true);
            }
          }
        }, (txObj, error) => {
          console.log(error);
        });
      }
    );
  }

  //change password
  const changePass = () => {
    if (newPassword.length >= 10 && newPassword.indexOf(" ") == -1) {
      setShortPass(false);
      setPassSpace(false);
      db.transaction(
        (tx) => {
          tx.executeSql("UPDATE users SET pword = ? WHERE user_id = ?", [(SHA256(newPassword)).toString(), userID], (txObj, { rows }) => {
            setPasswordModal(false);
          }, (txObj, error) => {
            console.log(error);
          });
        }
      );
    } else {
      if (newPassword.length < 10) {
        //password is not long enough
        setShortPass(true);
      }
      if (newPassword.indexOf(" ") >= 0) {
        //password has whitespace
        setPassSpace(true);
      }
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.basic} keyboardShouldPersistTaps="handled">
      <View style={styles.textHeader}>
          <Text style={styles.smallerHeader}>Hi, {userName}</Text>
      </View>
      {/* display user stats */}
      <View style={styles.inlineEvenly}>
        <View style={styles.statBox}>
          <View style={styles.numBox}>
            <Text style={styles.statNum}>{finishedTask}</Text>
          </View>
          <View style={styles.textBox}>
            <Text style={styles.statText}>Completed Tasks</Text>
          </View>
        </View>
        <View style={styles.statBox}>
          <View style={styles.numBox}>
            <Text style={styles.statNum}>{pendingTask}</Text>
          </View>
          <View style={styles.textBox}>
            <Text style={styles.statText}>Pending Tasks</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.accountButton} onPress={() => {setUsernameModal(true)}}>
        <View style={styles.accountItem}>
          <Text style={styles.statText}>Change Username</Text>
        </View>
      </TouchableOpacity>
      {/* pop up for new username input */}
      <View>
        <Modal isVisible={usernameModal} onBackButtonPress={() => {setUsernameModal(false); setNewUsername("")}} onBackdropPress={() => {setUsernameModal(false); setNewUsername("")}}>
          <View style={styles.changeModal}>
            {/* take in user input */}
            <View style={styles.changeText}>
              <TextInput placeholder="New username" defaultValue={newUsername} onChangeText={changeUsername => setNewUsername(changeUsername)} style={styles.inputSize} maxLength={20}/>
            </View>
            {/* duplicate username warning text */}
            {duplicateName? <View style={styles.errorText}><Text style={styles.errorFont}>A user with that username already exists.</Text></View> : null}
            {/* username contains space warning text */}
            {nameSpace? <View style={styles.errorText}><Text style={styles.errorFont}>Username cannot contain white spaces.</Text></View> : null}
            {/* submit new username input */}
            <View style={usernameDisabled? styles.disabledButton : styles.enabledButton}>
              <TouchableOpacity disabled={usernameDisabled} onPress={() => changeName()}>
                <View style={styles.changeButton}>
                  <Text style={styles.whiteText}>Apply</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
      <TouchableOpacity style={styles.accountButton} onPress={() => {setPasswordModal(true)}}>
        <View style={styles.accountItem}>
          <Text style={styles.statText}>Change Password</Text>
        </View>
      </TouchableOpacity>
      <View>
        <Modal isVisible={passwordModal} onBackButtonPress={() => {setPasswordModal(false); setNewPassword("")}} onBackdropPress={() => {setPasswordModal(false); setNewPassword("")}}>
          <View style={styles.changeModal}>
            {/* take in user input */}
            <View style={styles.changeText}>
              <TextInput placeholder="New password" defaultValue={newPassword} onChangeText={changePassword => setNewPassword(changePassword)} style={styles.inputSize} maxLength={40} secureTextEntry={true}/>
            </View>
            {/* short password warning text */}
            {shortPass? <View style={styles.errorText}><Text style={styles.errorFont}>Password needs at least 10 characters.</Text></View> : null}
            {/* password contains space warning text */}
            {passSpace? <View style={styles.errorText}><Text style={styles.errorFont}>Password cannot contain white spaces.</Text></View> : null}
            {/* submit new password input */}
            <View style={passwordDisabled? styles.disabledButton : styles.enabledButton}>
              <TouchableOpacity disabled={passwordDisabled} onPress={() => changePass()}>
                <View style={styles.changeButton}>
                  <Text style={styles.whiteText}>Apply</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
      {/* sign out button */}
      <View style={styles.smallView}>
        <TouchableOpacity onPress={() => {signOut()}}>
          <Text style={styles.logoutLink}>Log out {userName}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

//bottom tab and its associated screens
function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 50
        }
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({focused}) => (<VectorIcons name="list-ul" color={focused? "#141414": "#b3b3b3"} size={25}/>)
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarLabel: "Account",
          tabBarIcon: ({focused}) => (<VectorIcons name="user" color={focused? "#141414": "#b3b3b3"} size={30}/>)
        }}
      />
    </Tab.Navigator>
  );
}

//sign in screen
function SignInScreen({ navigation }) {
  //username
  const [username, setUsername] = useState("");
  //password
  const [password, setPassword] = useState("");
  //sign in button state
  const [disabled, setDisabled] = useState(true);
  //check wrong username
  const [wrongName, setWrongName] = useState(false);
  //check wrong password
  const [wrongPass, setWrongPass] = useState(false);

  //local storage
  /*
  //authenticate user
  const checkInfo = async (key, value) => {
    try {
      let pword = await SecureStore.getItemAsync(key);
      if (pword == value) {
        setSignIn(true);
        userName = key;
        navigation.navigate("TabNavigator");
      } else {
        setSignIn(false);
      }
    } catch (e) {
      setSignIn(false);
    }
  }
  */

  //create users table
  //stores login info and user stats
  useEffect(() => {
    db.transaction(
      (tx) => {
        tx.executeSql("CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY, dname VARCHAR, uname VARCHAR, pword VARCHAR, ftask INTEGER, utask INTEGER)", [], (txObj, { rows }) => {
        }, (txObj, error) => {
          console.log(error);
        });
      }
    );
  }, []);

  //disable submit button when input is empty
  useEffect(() => {
    if (username != "" && password != "") {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
  }, [username, password]);

  //reset warning text
  useEffect(() => {
    setWrongName(false);
  }, [username]);

  //reset warning text
  useEffect(() => {
    setWrongPass(false);
  }, [password]);

  //authenticate user
  const checkUser = () => {
    db.transaction(
      (tx) => {
        //check if username exists in database
        tx.executeSql("SELECT * FROM users WHERE uname = ?", [username.toLowerCase()], (txObj, { rows }) => {
          if (rows.length > 0) {
            //assign user id
            userID = rows.item(0).user_id;
            setWrongName(false);
            //encrypt password
            const encryptPass = (SHA256(password)).toString();
            //compare encrypted password
            if (encryptPass == rows.item(0).pword) {
              setWrongPass(false);
              //assign username
              userName = rows.item(0).dname;
              //assign stats
              finishedTask = rows.item(0).ftask;
              pendingTask = rows.item(0).utask;
              //sign in "token"
              signedIn = true;
              //reset login inputs
              setUsername("");
              setPassword("");
              navigation.replace("TabNavigator");
            } else {
              //wrong password
              setWrongPass(true);
            }
          } else {
            //no username found
            setWrongName(true);
          }
        }, (txObj, error) => {
          console.log(error)
        });
      }
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.basic} keyboardShouldPersistTaps="handled">
      <View style={styles.maxWidth}>
        <View style={styles.textHeader}>
          <Text style={styles.headerFont}>Log into existing account.</Text>
        </View>
        {/* login inputs */}
        <View style={styles.loginInput}>
          <TextInput placeholder="Username" defaultValue={username} onChangeText={username => setUsername(username)} style={styles.inputSize} maxLength={20}/>
        </View>
        {/* no account found warning text */}
        {wrongName? <View style={styles.errorText}><Text style={styles.errorFont}>There is no account with that username.</Text></View> : null}
        <View style={styles.loginInput}>
          <TextInput placeholder="Password" defaultValue={password} onChangeText={password => setPassword(password)} style={styles.inputSize} secureTextEntry={true} selectTextOnFocus={true} maxLength={40}/>
        </View>
        {/* wrong password warning text */}
        {wrongPass? <View style={styles.errorText}><Text style={styles.errorFont}>Incorrect password.</Text></View> : null}
        {/* submit button to authenticate login info */}
        <View style={styles.loginButton}>
          <TouchableOpacity disabled={disabled} style={disabled? styles.disabledButton : styles.enabledButton} onPress={() => {checkUser()}}>
              <VectorIcons name="arrow-circle-right" color="#2F2F2F" size={70}/>
          </TouchableOpacity>
        </View>
        {/* sign up screen */}
        <View style={styles.smallView}>
          <Text style={styles.smallText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => {navigation.replace("SignUp")}}>
            <Text style={styles.smallLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

//sign up screen
function SignUpScreen({ navigation }) {
  //username
  const [username, setUsername] = useState("");
  //password
  const [password, setPassword] = useState("");
  //confirm password
  const [passwordC, setPasswordC] = useState("");
  //sign up button state
  const [disabled, setDisabled] = useState(true);
  //check username  duplicate
  const [nameTaken, setNameTaken] = useState(false);
  //check password match
  const [mismatch, setMismatch] = useState(false);
  //check password length
  const [shortPass, setShortPass] = useState(false);
  //check for whitespace in username
  const [usernameSpace, setUsernameSpace] = useState(false);
  //check for whitespace in password
  const [passwordSpace, setPasswordSpace] = useState(false);

  //local storage
  /*
  const storeInfo = async (key, value) => {
    try {
      if (password == passwordC) {
        await SecureStore.setItemAsync(key, value);
        userName = key;
        navigation.navigate("TabNavigator");
      } else {
        Alert.alert();
      }
    } catch (e) {
      console.log(error);
    }
  }
  */

  //create users table
  //stores login info and user stats
  useEffect(() => {
    db.transaction(
      (tx) => {
        tx.executeSql("CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY, dname VARCHAR, uname VARCHAR, pword VARCHAR, ftask INTEGER, utask INTEGER)", [], (txObj, { rows }) => {
        }, (txObj, error) => {
          console.log(error);
        });
      }
    );
  }, []);

  //disable submit button when input is empty
  useEffect(() => {
    if (username != "" && password != "" && passwordC != "") {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
  }, [username, password, passwordC]);

  //reset warning text
  useEffect(() => {
    setNameTaken(false);
    setUsernameSpace(false);
  }, [username]);

  //reset warning text
  useEffect(() => {
    setMismatch(false);
    setShortPass(false);
    setPasswordSpace(false);
  }, [password, passwordC]);

  //register user
  const addUser = () => {
    db.transaction(
      (tx) => {
        //check for duplicates
        tx.executeSql("SELECT * FROM users WHERE uname = ?", [username.toLowerCase()], (txObj, { rows }) => {
          if (rows.length == 0 && password == passwordC && password.length >= 10 && passwordC.length >= 10 && username.indexOf(" ") == -1 && password.indexOf(" ") == -1 && passwordC.indexOf(" ") == -1) {
            setNameTaken(false);
            setMismatch(false);
            setShortPass(false);
            setUsernameSpace(false);
            setPasswordSpace(false);
            //encrypted password for storage
            const encryptPass = (SHA256(password)).toString();
            //add user info to database
            tx.executeSql("INSERT INTO users (dname, uname, pword, ftask, utask) VALUES (?, ?, ?, ?, ?)", [username, username.toLowerCase(), encryptPass, 0, 0], (txObj, { rows }) => {
              tx.executeSql("SELECT * FROM users WHERE uname = ?", [username.toLowerCase()], (txObj, { rows }) => {
                //assign user id
                userID = rows.item(0).user_id;
                //assign username
                userName = rows.item(0).dname;
                //assign stats
                finishedTask = rows.item(0).ftask;
                pendingTask = rows.item(0).utask;
                //sign in "token"
                signedIn = true;
                //reset register inputs
                setUsername("");
                setPassword("");
                setPasswordC("");
                navigation.replace("TabNavigator");
              }, (txObj, error) => {
                console.log(error);
              });
            }, (txObj, error) => {
              console.log(error);
            });
          } else {
            if (rows.length > 0) {
              //name taken
              setNameTaken(true);
            }
            if (password != passwordC){
              //password mismatch
              setMismatch(true);
            }
            if (password.length < 10 || passwordC.length < 10) {
              setShortPass(true);
            }
            if (username.indexOf(" ") >= 0) {
              setUsernameSpace(true);
            }
            if (password.indexOf(" ") >= 0 || passwordC.indexOf(" ") >= 0) {
              setPasswordSpace(true);
            }
          }
        }, (txObj, error) => {
          console.log(error);
        });
      }
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.basic} keyboardShouldPersistTaps="handled">
      <View style={styles.maxWidth}>
        <View style={styles.textHeader}>
          <Text style={styles.headerFont}>Create new account.</Text>
        </View>
        {/* register input */}
        <View style={styles.loginInput}>
          <TextInput placeholder="Username" defaultValue={username} onChangeText={username => setUsername(username)} style={styles.inputSize} maxLength={20}/>
        </View>
        {/* duplicate username warning text */}
        {nameTaken? <View style={styles.errorText}><Text style={styles.errorFont}>A user with that username already exists.</Text></View> : null}
        {/* username contains space warning text */}
        {usernameSpace? <View style={styles.errorText}><Text style={styles.errorFont}>Username cannot contain white spaces.</Text></View> : null}
        <View style={styles.loginInput}>
          <TextInput placeholder="Password" defaultValue={password} onChangeText={password => setPassword(password)} style={styles.inputSize} secureTextEntry={true} selectTextOnFocus={true} maxLength={40}/>
        </View>
        <View style={styles.loginInput}>
          <TextInput placeholder="Confirm Password" defaultValue={passwordC} onChangeText={password => setPasswordC(password)} style={styles.inputSize} secureTextEntry={true} selectTextOnFocus={true} maxLength={40}/>
        </View>
        {/* mismatched password warning text */}
        {mismatch? <View style={styles.errorText}><Text style={styles.errorFont}>Password does not match.</Text></View> : null}
        {/* short password warning text */}
        {shortPass? <View style={styles.errorText}><Text style={styles.errorFont}>Password needs at least 10 characters.</Text></View> : null}
        {/* password contains space warning text */}
        {passwordSpace? <View style={styles.errorText}><Text style={styles.errorFont}>Password cannot contain white spaces.</Text></View> : null}
        <View style={styles.loginButton}>
          <TouchableOpacity disabled={disabled} style={disabled? styles.disabledButton : styles.enabledButton} onPress={() => {addUser()}}>
              <VectorIcons name="arrow-circle-right" color="#2F2F2F" size={70}/>
          </TouchableOpacity>
        </View>
        {/* login screen */}
        <View style={styles.smallView}>
          <Text style={styles.smallText}>Have an account? </Text>
          <TouchableOpacity onPress={() => {navigation.replace("SignIn")}}>
            <Text style={styles.smallLink}>Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

//main function
function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="SignIn" screenOptions={{headerShown: false}}>
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="TabNavigator" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;

//styles
const styles = StyleSheet.create({
  basic: {
    alignItems: "center",
    flexGrow: 1
  },

  mainHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%"
  },

  textHeader: {
    width: "100%",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 20,
    paddingRight: 20,
  },

  smallerHeader: {
    fontSize: 30,
    fontWeight: "bold",
  },

  taskHeader: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 20,
    paddingRight: 20,
  },

  headerButton: {
    justifyContent: "center",
    paddingRight: 15
  },

  taskButton: {
  },

  enabledButton: {
    opacity: 1
  },

  disabledButton: {
    opacity: 0.5
  },

  generalModal: {
    backgroundColor: "#ffffff",
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 20,
    borderRadius: 20
  },

  inlineTogether: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  inlineEvenly: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    margin: 5
  },

  inlineTask: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-end"
  },

  inlineButton: {
    paddingLeft: 10,
    paddingRight: 10
  },

  lineText: {
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    width: "80%"
  },

  lineButton: {
    width: "20%",
    alignItems: "center"
  },

  inputSize: {
    fontSize: 18,
    padding: 15
  },

  textSize: {
    fontSize: 20,
    padding: 10
  },

  listItem: {
    padding: 20,
    margin: 5,
    width: "90%",
    borderRadius: 10,
    backgroundColor: "#ffffff"
  },

  maxWidth: {
    width: "100%",
    color: "#f2f2f2",
    alignItems: "center",
    flexGrow: 1
  },

  loginInput: {
    padding: 5,
    marginTop: 10,
    width: "90%",
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },

  loginButton: {
    width: "100%",
    alignItems: "center",
    padding: 15
  },

  headerFont: {
    fontSize: 40,
    fontWeight: "bold"
  },

  smallView: {
    padding: 15,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    flexGrow: 1,
    alignItems: "flex-end"
  },

  smallText: {
    fontSize: 16
  },

  smallLink: {
    fontSize: 16,
    color: "#328fed"
  },

  logoutLink: {
    fontSize: 16,
    color: "#e61717"
  },

  statBox: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 10
  },
  
  numBox: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    padding: 20
  },

  textBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10
  },
  
  statNum: {
    fontSize: 30,
    fontWeight: "bold"
  },

  statText: {
    fontSize: 14,
    opacity: 0.7
  },

  errorText: {
    width: "90%"
  },

  errorFont: {
    fontSize: 14,
    color: "#ba2727"
  },

  accountButton: {
    width: "90%",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    padding: 15,
    margin: 5
  },

  accountItem: {
    width: "100%",
    alignItems: "center"
  },

  changeModal: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 20
  },

  changeText: {
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    width: "100%"
  },

  changeButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    padding: 15,
    backgroundColor: "#2F2F2F",
    borderRadius: 5
  },

  whiteText: {
    color: "#ffffff",
    fontSize: 16
  }
});