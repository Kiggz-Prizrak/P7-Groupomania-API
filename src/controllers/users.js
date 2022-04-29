const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { promises: fs } = require('fs');
const { User } = require('../models');

// Création de l'user
exports.signup = async (req, res) => {
  const userObject = req.body;
  const userEmailFind = await User.findOne({ where: { email: req.body.email } });
  if (userEmailFind) {
    if (req.files) await fs.unlink(`images/${req.files.avatar[0].filename}`);
    return res.status(400).json({ message: 'email already used' });
  }

  if (
    typeof req.body.email !== 'string'
    || typeof userObject.password !== 'string'
    || typeof userObject.username !== 'string'
    || typeof userObject.lastName !== 'string'
    || typeof userObject.firstName !== 'string'
  ) {
    if (req.files) await fs.unlink(`images/${req.files.avatar[0].filename}`);
    return res.status(400).json({ message: 'please provides all fields' });
  }

  // vérification des champs de noms
  const userFieldsValidator = [
    userObject.username,
    userObject.lastName,
    userObject.firstName,
  ];
  for (let i = 0; i < userFieldsValidator.length; i += 1) {
    if (!/^[\wàèìòùÀÈÌÒÙáéíóúýÁÉÍÓÚÝâêîôûÂÊÎÔÛãñõÃÑÕäëïöüÿÄËÏÖÜŸçÇßØøÅåÆæœ\d '-]+$/.test(userFieldsValidator[i])) {
      if (req.files) await fs.unlink(`images/${req.files.avatar[0].filename}`);
      return res.status(400).json({ message: 'champs invalide' });
    }
  }

  // vérification de l'e-mail
  if (!/^[\w\d.+-]+@[\w.-]+\.[a-z]{2,}$/.test(req.body.email)) {
    if (req.files) await fs.unlink(`images/${req.files.avatar[0].filename}`);
    return res.status(400).json({ message: 'email invalide' });
  }

  // vérification du password
  if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[_.@$!%*#?&])[A-Za-z\d_.@$!%*#?&]{8,}$/.test(req.body.password)) {
    if (req.files) await fs.unlink(`images/${req.files.avatar[0].filename}`);
    return res.status(400).json({ message: 'mot de passe invalide' });
  }

  // cryptage du mot de passe
  const hash = await bcrypt.hash(req.body.password, 10);

  delete req.body.isAdmin;

  // création de l'user
  if (!req.files) {
    const defaultAvatar = 'http://localhost/images/default_avatar.png';
    const user = User.create({
      isAdmin: false,
      email: req.body.email,
      password: hash,
      username: req.body.username,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      avatar: defaultAvatar,
    });
    if (user) return res.status(201).json({ message: 'Utilisateur créé' });
  } else {
    const user = User.create({
      isAdmin: false,
      email: req.body.email,
      password: hash,
      username: req.body.username,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      avatar: `${req.protocol}://${req.get('host')}/images/${req.files.avatar[0].filename}`,
    });
    if (user) return res.status(201).json({ message: 'Utilisateur créé' });
  }

  if (req.files) await fs.unlink(`images/${req.files.avatar[0].filename}`);
  return res.status(404).json({ message: 'Error' });
};

// Connexion de l'user
exports.login = async (req, res) => {
  if (typeof req.body.email !== 'string' || typeof req.body.password !== 'string') {
    if (req.files) await fs.unlink(`images/${req.files.avatar[0].filename}`);
    if (req.files) await fs.unlink(`images/${req.files.avatar[0].filename}`);
    return res.status(400).json({ message: 'please provides all the fields' });
  }

  const user = await User.findOne({ where: { email: req.body.email } })
    .catch(async (error) => {
      res.status(500).json({ error });
      if (req.files) await fs.unlink(`images/${req.files.avatar[0].filename}`);
    });
  if (!user) {
    if (req.files) await fs.unlink(`images/${req.files.avatar[0].filename}`);
    return res.status(404).json({ message: 'utilisateur non trouvé' });
  }
  // comparaison du hash du MDP de la BDD et du MDP de la req
  const valid = await bcrypt
    .compare(req.body.password, user.password)
    .catch(async (error) => {
      res.status(500).json({ error });
      if (req.files) await fs.unlink(`images/${req.files.avatar[0].filename}`);
    });
  if (!valid) {
    return res.status(400).json({ error: 'Mot de passe incorrect' });
  }

  // création du token (si valide)
  return res.status(200).json({
    user,
    token: jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET_TOKEN,
      { expiresIn: '24h' },
    ),
  });
};

// Get all users
exports.getAllUsers = async (req, res) => {
  const users = await User.findAll({
    order: [['createdAt', 'DESC']],
  })
    .catch((error) => res.status(404).json({ error }));
  return res.status(200).json(users);
};

// Get one User
exports.getOneUser = async (req, res) => {
  const user = await User.findOne({ where: { id: req.params.id } })
    .catch((error) => res.status(404).json({ error }));
  return res.status(200).json(user);
};

// modify User
exports.modifyUser = async (req, res) => {
  const userModifier = await User.findOne({ where: { id: req.params.id } });
  if (userModifier === null) {
    if (req.files) await fs.unlink(`images/${req.files.avatar[0].filename}`);
    return res.status(404).json({ message: 'User not found' });
  }

  if (userModifier.id != req.auth.userId) {
    if (req.files) await fs.unlink(`images/${req.files.avatar[0].filename}`);
    return res.status(403).json({ message: 'Unauthorized request' });
  }

  const userObject = req.files ? {
    ...req.body,
    avatar: `${req.protocol}://${req.get('host')}/images/${req.files.avatar[0].filename}`,
  } : req.body;

  // vérification de l'e-mail
  if (!/^[\w\d.+-]+@[\w.-]+\.[a-z]{2,}$/.test(req.body.email)) {
    if (req.files) await fs.unlink(`images/${req.files.avatar[0].filename}`);
    return res.status(400).json({ message: 'email invalide' });
  }
  // vérification du password
  if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[_.@$!%*#?&])[A-Za-z\d_.@$!%*#?&]{8,}$/.test(req.body.password)) {
    if (req.files) await fs.unlink(`images/${req.files.avatar[0].filename}`);
    return res.status(400).json({ message: 'mot de passe invalide' });
  }
  // cryptage du mot de passe
  userObject.password = await bcrypt.hash(req.body.password, 10);
  if (typeof userObject.email !== 'string' || typeof userObject.password !== 'string') {
    if (req.files) await fs.unlink(`images/${req.files.avatar[0].filename}`);
    return res.status(400).json({ message: 'please provides all fields' });
  }

  await User.update({ ...userObject, id: req.params.id }, { where: { id: req.params.id } })
    .catch((error) => res.status(400).json({ error }));
  if (req.files) {
    const filename = userModifier.avatar.split('/images/')[1];
    await fs.unlink(`images/${filename}`);
  }
  return res.status(200).json({ message: 'User modifié' });
};

// DELETE USER
exports.deleteUser = async (req, res) => {
  const user = await User.findOne({ where: { id: req.params.id } });
  if (user === null) {
    return res.status(404).json({ message: 'User not found' });
  }
  if (user.id !== req.auth.userId) {
    return res.status(403).json({ message: 'Unauthorized request' });
  }
  const filename = user.avatar.split('/images/')[1];
  await fs.unlink(`images/${filename}`);
  await User.destroy({ where: { id: req.params.id } })
    .catch((error) => res.status(400).json({ error }));
  return res.status(200).json({ message: 'Objet supprimé !' });
};
