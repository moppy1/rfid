const vUsers = new Vue(
{
  el: '#app',
  data: 
  {
    title: 'Benutzerverwaltung',
    users: [{name: 'Gustav', id: 'XYZ'}],
    lastLogin: '',
    lastUser: ''
  },

  mounted()
  {
    this.registerShortcut();
    this.addUser('3903930313003039353933400','Tobi',false)
  },

  methods:
  {
    toggleLogin(id)
    {
      let userIdx = this.getUserIndexById(id);
      if(userIdx != -1)
      {
        let user = this.getUserByIndex(userIdx);
        user.loggedIn = !user.loggedIn;
        Vue.set(vUsers.users, userIdx, user); 
      }
      else
      {
        this.addUser(id);
      }
      let lastUser = this.getUserById(id);
      this.lastLogin = moment().format("HH:mm:ss");
      this.lastUser = lastUser.name;
      this.updateUi(id);
    },
    setUserName(id)
    {

    },
    userExists(id)
    {
      return this.getUserIndexById(id) != -1;
    },
    addUser(id,name,logIn=true)
    {
      this.users.push(
        {
          id: id,
          name: name || 'User '+this.users.length,
          loggedIn: logIn
        })
    },
    removeUserById(id)
    {
      let index = this.getUserIndexById(id);
      if(index != -1)
        this.removeUserByIndex(index)
    },
    removeUserByIndex(index)
    {
      vUsers.users.splice(index,1)
    },
    getUserIndexById(id)
    {
      return this.users.findIndex(user => user.id == id);
    },
    getUserById(id)
    {
      return this.users.filter(user => user.id == id)[0];
    },
    getUserByIndex(index)
    {
      return this.users[index];
    },
    updateUi(id)
    {
      const user = this.getUserById(id);
      if(!user) return
      const loggedIn = user.loggedIn;
      const name = user.name;
      let prefix = loggedIn ? 'Hallo' : 'Tschüss';
      let msg = `${prefix}, ${name}!`
      document.getElementById('message').innerText = msg;
      document.getElementById('rfid_display').innerText = 'RFID: '+id;
    },
    registerShortcut()
    {
      const testID = '3903930313003039353933400';
      const keyCb = (e) => 
      {
        if(e.keyCode == 32)
        this.toggleLogin(testID)
      }
      document.addEventListener('keydown', keyCb);
    }
  }
});