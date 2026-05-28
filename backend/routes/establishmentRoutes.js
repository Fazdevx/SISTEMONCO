const express = require("express");
const router = express.Router();
const establishmentController = require("../controllers/establishmentController");
const { verifyToken, loadProfile } = require("../middleware/auth");

router.use(verifyToken);
router.use(loadProfile);
router.get("/microredes", establishmentController.getMicroredes);
router.get("/establecimientos", establishmentController.getEstablecimientos);
router.put("/:id/meta", establishmentController.updateEstablishmentMeta); // Nueva ruta para actualizar meta

module.exports = router;
