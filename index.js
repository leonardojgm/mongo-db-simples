const { PORT, URL, DATABASE_NAME } = require ('./constants.js');
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const Ajv = require("ajv");
const app = express();
const port = PORT;
const url = URL;
const dbName = DATABASE_NAME;
const ajv = new Ajv();
const schema = {
  type: "object",
  properties: {
    realName: {type: "string"},
    nickname: {type: "string"},
    description: {type: "string"},
  },
  required: ["realName", "nickname", "description"],
  additionalProperties: false,
}
let db; 

async function connectToMongo() {
  const client = new MongoClient(url);
  await client.connect();

  console.log(`Connected successfully to MongoDB ${url}`);

  db = client.db(dbName);
}

function createIndex() { 
  db.collection('characters').createIndex( { "nickname": "text" }, function(err, result) {
   console.log(result);

   callback(result);
  });

  console.log(`Index created successfully for collection characters.`);
}

app.use(express.json());

app.get('/', (req, res) => {
  try {
    res.send('Hello World!');
  } catch (error) {
    console.error('Error fetching data hello world:', error);
    
    res.status(500).send('Erro ao exibir Hello World.');
  }
})

app.get('/characters/list', async (req, res) => {
  try {
    const collection = db.collection('characters');
    const characters = await collection.find().toArray();

    res.json(characters);
  } catch (error) {
    console.error('Error fetching data characters list:', error);
    res.status(500).send('Erro ao buscar personagens.');
  }
})

app.get('/characters/paginated', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 4;
    const skip = (page - 1) * pageSize;
    const collection = db.collection('characters');
    const totalResults = await collection.countDocuments();
    const totalPages = Math.ceil(totalResults / pageSize);
    const characters = await collection.find().skip(skip).limit(pageSize).toArray();

    res.set({
      'X-Page': page,
      'X-Page-Size': pageSize,
      'X-Total-Pages': totalPages,
      'X-Total-Results': totalResults
    });
    res.json(characters);
  } catch (error) {
    console.error('Error fetching data characters list:', error);
    res.status(500).send('Erro ao buscar personagens.');
  }
})

app.get('/characters/:id', async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send('ID inválido.');
    }

    const collection = db.collection('characters');
    const character = await collection.findOne({ _id: new ObjectId(id) });
    
    if (character) {
      res.json(character);
    } else {
      res.status(404).send(`Personagem não encontrado com o ID: ${id}`);
    }
  } catch (error) {
    console.error('Error fetching data characters by id:', error);

    res.status(500).send('Erro ao buscar personagem.');
  }  
})

app.get('/characters', async (req, res) => {
  try {
    const nickname = req.query.nickname;

    if (!nickname) {
      return res.status(400).send('Parâmetro "nickname" é obrigatório.');
    }

    const collection = db.collection('characters');
    const character = await collection.findOne({
      $or: [
        { nickname: new RegExp(`^${nickname}$`, 'i') }
      ]
    });
    
    if (character) {
      res.json(character);
    } else {
      res.status(404).send(`Personagem não encontrado com o nome: ${nickname}`);
    }
  } catch (error) {
    console.error('Error fetching data characters by nickname:', error);

    res.status(500).send('Erro ao buscar personagem.');
  }  
})

app.post('/characters', async (req, res) => {
  try {
    const validate = ajv.compile(schema);
    const valid = validate(req.body);

    if (!valid) {
      console.log(validate.errors);
      
      return res.status(400).send({message: 'Os dados enviados não são validos para criar personagem.', errors: validate.errors});
    }

    const collection = db.collection('characters');
    const character = req.body;

    await collection.insertOne(character);

    res.status(201).send('Personagem criado com sucesso');
  } catch (error) {
    console.error('Error creating character:', error);

    res.status(500).send('Erro ao criar personagem.');
  }
})

app.delete('/characters/:id', async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send('ID inválido.');
    }

    const collection = db.collection('characters');
    const character = await collection.findOne({ _id: new ObjectId(id) });
    
    if (character) {
      await collection.deleteOne({ _id: new ObjectId(id) });

      res.send('Personagem excluido com sucesso');
    } else {
      res.status(404).send(`Personagem não encontrado com o ID: ${id}`);
    }
  } catch (error) {
    console.error('Error deleting character:', error);

    res.status(500).send('Erro ao excluir personagem.');
  }  
})

app.delete('/characters/', async (req, res) => {
  try {
    const nickname = req.query.nickname;
    const collection = db.collection('characters');
    const character = await collection.findOne({ nickname: new RegExp(`^${nickname}$`, 'i') });
    
    if (character) {
      await collection.deleteOne({ _id: character._id });

      res.send('Personagem excluido com sucesso');
    } else {
      res.status(404).send(`Personagem não encontrado com o Nickname: ${nickname}`);
    }
  } catch (error) {
    console.error('Error deleting character:', error);

    res.status(500).send('Erro ao excluir personagem.');
  }  
})

app.put('/characters/:id', async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send('ID inválido.');
    }

    const collection = db.collection('characters');
    const character = await collection.findOne({ _id: new ObjectId(id) });
    
    if (character) {
      await collection.updateOne({ _id: new ObjectId(id) }, { $set: req.body });

      res.send('Personagem atualizado com sucesso');
    } else {
      res.status(404).send(`Personagem não encontrado com o ID: ${id}`);
    }
  } catch (error) {
    console.error('Error updating character:', error);

    res.status(500).send('Erro ao atualizar personagem.');
  }  
})

app.put('/characters', async (req, res) => {
  try {
    const nickname = req.query.nickname;

    if (!nickname) {
      return res.status(400).send('Parâmetro "nickname" é obrigatório.');
    }

    const collection = db.collection('characters');
    const character = await collection.findOne({
      $or: [
        { nickname: new RegExp(`^${nickname}$`, 'i') }
      ]
    });
    
    if (character) {
      await collection.updateOne({ nickname: new RegExp(`^${nickname}$`, 'i') }, { $set: req.body });

      res.send('Personagem atualizado com sucesso');
    } else {
      res.status(404).send(`Personagem atualizado com o nome: ${nickname}`);
    }
  } catch (error) {
    console.error('Error updating characters by nickname:', error);

    res.status(500).send('Erro ao buscar personagem.');
  }  
})

app.listen(port, async () => {
  try {
    await connectToMongo();

    createIndex();

    console.log(`App listening at http://localhost:${port}`);
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  }
})