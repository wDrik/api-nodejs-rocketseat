const express = require('express');
const authMiddleware = require('../middlewares/auth');

const Project = require('../models/Project');
const Task = require('../models/Task');

const router = express.Router();

router.use(authMiddleware);

//--> List
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find().populate(['user', 'tasks']);

        return res.send({ projects })
    } catch (err) {
        return res.status(400).send({ error: 'Error loading projects' });
    }
});

//--> Show
router.get('/:projectId', async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId).populate(['user', 'tasks']);

        return res.send({ project })
    } catch (err) {
        return res.status(400).send({ error: 'Error loading project' });
    }
});

//--> Create
router.post('/', async (req, res) => {
    try {
        const { title, description, tasks } = req.body;

        const project = await Project.create({ 
            title,
            description, 
            user: req.userId 
        });

        await Promise.all(tasks.map(async task => {
            const projectTask = new Task({ ...task, project: project._id });

            await projectTask.save();
            project.tasks.push(projectTask);
        }));

        await project.save();
        
        return res.send({ project });
    } catch(err) {
        return res.status(400).send({ error: 'Error creating new project' });
    }
});

//--> Update
router.put('/:projectId', async (req, res) => {
    try {
        const { title, description, tasks } = req.body;

        const project = await Project.findByIdAndUpdate(req.params.projectId, {
            title,
            description,
        }, { new: true });

        project.tasks = [];
        await Task.remove({ project: project.projectId });

        await Promise.all(tasks.map(async task => {
            const projectTask = new Task({ ...task, project: project._id });

            await projectTask.save();
            project.tasks.push(projectTask);
        }));

        await project.save();

        return res.send({ project });
    } catch (err) {
        return res.status(400).send({ error: 'Error updating project' });
    }
});

//--> Delete
router.delete('/:projectId', async (req, res) => {
    try {
        await Project.findByIdAndRemove(req.params.projectId);

        return res.send()
    } catch (err) {
        return res.status(400).send({ error: 'Error deleting project' });
    }
});


module.exports = app => app.use('/projects', router);
