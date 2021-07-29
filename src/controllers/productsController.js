const path = require('path');
const fs = require('fs')
const productsModel = require('../model/productsModel')
const {validationResult} = require('express-validator')
const db = require('../database/models');
const { log } = require('console');

let productController = {
    list: async (req, res)=>{ 
        const productList = await db.Model.findAll({
            include: ['brand', 'cellphones']
        })
        const brand = 'Todos los Productos'

        res.render('products/products', {productList, brand})
    },
    adminList: async (req,res)=>{
        try {
            //busca todas las Brands
            const brandList = await db.Brand.findAll( {
                order: [['id', 'ASC']]
            }) 
            
            //busca todos los Models
            const modelList = await db.Model.findAll({
                include: ['brand'],
                order: [['id_brand', 'ASC']]
            }) 
    
            //busca todos los Celulares
            const productList = await db.Cellphone.findAll({
                include: [{
                    association: 'model',
                },
                {
                    association: 'color',
                },
                {
                    association: 'ram',
                }]
            })
     
            res.render('products/adminList', {productList, brandList, modelList})
            
        } catch (error) { //si hay error, muestra el error en consola y vista de error
            console.log(error);
            res.status(500).render('soon', {error})
        }

        
    },
    
    brandList: async (req, res) => {
        const {brand} = req.params
        //tengo q buscar el id correspondiente al brand que me llega por parametro
        
        const myBrand = await db.Brand.findOne({
            where: {                
                name: brand
            }
        })
        
        const productList = await db.Model.findAll({
            include: ['brand'],
            where: {                
                id_brand: myBrand.id
            }
        })
        console.log(productList)
        
        res.render('products/products', {productList, brand})

    },

    detail:(req,res)=>{
        const {id} = req.params
        
        const idDetail = productsModel.findByPk(id)
        const brandList = productsModel.findByBrand(idDetail.brand) 
        const relatedList = productsModel.randomize(brandList,2) 

        res.render('products/productDetail', {idDetail, relatedList})
    },
    
    search(req,res){
        let errors = validationResult(req)

        if (!errors.isEmpty()){

            const brand = 'Todos los Productos'
            const productList = productsModel.findAll()
            
            if (req.query.userValue == ''){
                res.redirect('/')
            }
            else {
                res.render('products/products', {error: errors.mapped(), productList, brand})
            }
            
            return
        }

        const { userValue } = req.query
        const idDetail = productsModel.findByName(userValue)
        const productList = productsModel.findByBrand(userValue)
        
        if (idDetail){
            const brandList = productsModel.findByBrand(idDetail.brand) 

            const relatedList = productsModel.randomize(brandList,2) 
            
            res.render('products/productDetail', {idDetail, relatedList})
        }
        else if(productList){
            res.render('products/products', {productList, brand:userValue})
        }
        
    },

    newProductForm: async (req,res)=>{
        const { brand, model } = req.query
        try {
            //busca la Marca segun el query string
            let brandToUse = await db.Brand.findOne({
                where:{name:brand}
            })
            //si No existe, arma objeto de marca e imagen vacios para la vista
            if (!brandToUse){
                brandToUse = {
                    name:'',
                    imageToUse: ''
                }
            }else{ //si existe, modifica el path para la imagen para usar en la vista
                brandToUse.imageToUse = '/images/logos/'+brandToUse.logo
            } 
            
            //busca el Modelo segun el query string
            let modelToUse = await db.Model.findOne({
                where:{model}
            })        
            //si No existe, arma objeto de marca e imagen vacios para la vista
            if (!modelToUse){
                modelToUse = {
                    model:'',
                    imageToUse:''
                }
            } else{//si existe, modifica el path para la imagen para usar en la vista
                modelToUse.imageToUse = '/images/cellphones/models/'+modelToUse.mainImage
            } 
            
            //busca el todas las opciones de Ram y Color
            const ramList = await db.Ram.findAll()
            const colorList = await db.Color.findAll()
            
            res.render('products/newProduct', {brandToUse, modelToUse, ramList, colorList})
            
        } catch (error) { //si hay error, muestra el error en consola y vista de error
            console.log(error);
            res.status(500).render('soon', {error})
        }
    },
    createNewProduct: async (req, res) => {
        try {
            let errors = validationResult(req)
            //Si ha errores, guarda valores del usuario para volver a mostrar
            if (!errors.isEmpty()){
                let brand = {
                    name: req.body.brand,
                    imageToUse:''
                }
                
                const isBrand = await db.Brand.findOne({
                    where:{name:brand.name}
                })
                
                if(isBrand){
                    brand.imageToUse = '/images/logos/'+isBrand.logo
                }
    
                let model = {
                    name: req.body.model,
                    imageToUse:''
                }
                
                const isModel = await db.Model.findOne({
                    where:{model:model.name}
                })
                if(isModel){
                    model.imageToUse = '/images/cellphones/models/'+isModel.mainImage
                }
    
                const price = req.body.price
                const offer = req.body.offer ? req.body.offer : 0
                const color = req.body.color
                const ram = req.body.ram
                
                const userChoices = {brand, model, price, offer, color, ram}
                
                const ramList = await db.Ram.findAll()
                const colorList = await db.Color.findAll()
                
                res.render('products/newProduct', {errors:errors.mapped(), userChoices, ramList, colorList})
                
                return //corta el codigo para que no continue luego del if
            }
    
            // si no hay errores, busca Marca elegida por el usuario
            let brandToSave = await db.Brand.findOne({
                where: { name:req.body.brand }
            })
    
            // si No existe crea la marca nueva en la BdD
            if(!brandToSave){
    
                brandToSave = await db.Brand.create(
                    { 
                        name: req.body.brand,
                        logo: req.files.logo[0].filename
                    }
                )
            }
            // guarda el id de la marca
            const idBrand = brandToSave.id 
            
            // busca Modelo elegido por el usuario
            let modelToSave = await db.Model.findOne({
                where: { model:req.body.model }
            })
            
            // si No existe crea el modelo nuevo en la BdD
            if(!modelToSave){
                modelToSave = await db.Model.create(
                    { 
                        idBrand,
                        model: req.body.model,
                        mainImage: req.files.modelMainImage[0].filename
                    }
                    )
                }
                
            //guarda toda la info del nuevo celular
    
            const idModel = modelToSave.id
                    
            const idColor = req.body.color
            
            const idRam = req.body.ram
    
            const price = Number(req.body.price)
    
            const offer = Number(req.body.offer)
            
            const imageOne = req.files.imageOne[0].filename
            const imageTwo = req.files.imageTwo[0].filename
            const imageThree = req.files.imageThree[0].filename
    
            const newProduct = {idModel, idColor, idRam, price, offer, imageOne, imageTwo, imageThree}
                
            //crea el nuevo celular en la BdD
            const newCellphone = await db.Cellphone.create( newProduct )
            // res.redirect('products/adminList')
            res.redirect('/products/'+newCellphone.id)
            
        } catch (error) {//si hay error, muestra el error en consola y vista de error
            console.log(error);
            res.status(500).render('soon')
        }
    },

    editProductForm (req, res){
        
        const {id} = req.params;
        const idDetail = productsModel.findByPk(id)
    
        res.render('products/editProduct',{idDetail})
    },
    

    updateProduct (req,res){

        const imagePath = `/images/cellphones/${req.body.brand}/${req.body.model}/`

        const mainImageUser = req.files.mainImage[0]
        const mainImage = imagePath + mainImageUser.filename        
        
        const imagesUser = req.files.images
        let images = []
        imagesUser.forEach(e => {
            let newImage = imagePath + e.filename
            images.push(newImage)
        })
        
                        
        const data = req.body
        const {id} = req.params;
        
        productsModel.update (data,id,mainImage,images)

        res.redirect('/')
        
       
    },

    destroy: async (req, res) => {
        const id = req.params.id;

        try {
            const deleteCellphone = await db.Cellphone.destroy({
                where: {id}
            })
            
            res.redirect('/products/list' )
        } catch (error) {//si hay error, muestra el error en consola y vista de error
            console.log(error);
            res.status(500).render('soon')
        }
        
    },
    
}

module.exports = productController