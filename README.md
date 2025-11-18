-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: upgrade_tracker
-- ------------------------------------------------------
-- Server version	5.5.5-10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `application`
--

DROP TABLE IF EXISTS `application`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application` (
  `ApplicationID` varchar(100) NOT NULL,
  `ApplicationName` varchar(100) DEFAULT NULL,
  `DigitalUnit` varchar(100) NOT NULL,
  `InHouseVendor` varchar(20) DEFAULT NULL,
  `Type` varchar(50) DEFAULT NULL,
  `Status` varchar(20) DEFAULT NULL,
  `RAG` int(11) NOT NULL,
  `PM` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`ApplicationID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `application`
--

LOCK TABLES `application` WRITE;
/*!40000 ALTER TABLE `application` DISABLE KEYS */;
INSERT INTO `application` VALUES ('1','onek','Digital GBU','InHouse','exe','exe-design',2,'Meha'),('123','Test','Digital CF','InHouse','exe','exe-design',2,'Meha'),('APM0008238','PALMS','Digital GBU','InHouse','exe','exe-design',2,'Pavan Kumar'),('APM0008931','BIOVIA ACD','Digital M&S','InHouse','exe','exe-UAT',0,'Divya'),('APM0009282','ARMADA','Digital GBU','Vendor','exe','exe-design',2,'Pavan Kumar'),('APM0054868','IBM ILMT','Digital Tech','InHouse','pnp','Pnp-completed',2,'Lokesh'),('APM0055933','SFD-ZVS-FF','Digital M&S','InHouse','exe','Pnp-in progress',2,'Meha'),('APM0074963','SK Site Access Control Software','Digital GBU','Vendor','pnp','Pnp-completed',2,'Pavan Kumar'),('APM0075419','IVTRACER Vitry CRV','Digital CF','InHouse','pnp','Pnp-blocked',2,'Lokesh'),('APM8899','CORTEX','Digital GBU','InHouse','exe','exe-completed',1,'Divya'),('APM9988','MISC','Digital R&D','InHouse','exe','exe-build',2,'Pavan Kumar'),('ARM0064715','My Comet Africa','Digital M&S','Vendor','exe','exe-design',2,'Lokesh');
/*!40000 ALTER TABLE `application` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `effort_tracker`
--

DROP TABLE IF EXISTS `effort_tracker`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `effort_tracker` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ApplicationID` varchar(20) DEFAULT NULL,
  `ApplicationName` varchar(100) DEFAULT NULL,
  `ResourceID` int(11) DEFAULT NULL,
  `ResourceName` varchar(100) DEFAULT NULL,
  `RoleName` varchar(50) DEFAULT NULL,
  `TotalEffort` decimal(10,2) DEFAULT NULL,
  `Rate` decimal(10,2) DEFAULT NULL,
  `TotalCost` decimal(10,2) DEFAULT NULL,
  `Grade` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `effort_tracker`
--

LOCK TABLES `effort_tracker` WRITE;
/*!40000 ALTER TABLE `effort_tracker` DISABLE KEYS */;
INSERT INTO `effort_tracker` VALUES (5,'APM0008931','BIOVIA ACD',2344746,'Samrat Singh','AIMS',7.75,1.80,13.95,'PAT'),(8,'ARM0064715','My Comet Africa',2207036,'Pavan Kumar','PM',0.00,2.00,0.00,NULL),(9,'ARM0064715','My Comet Africa',2009385,'Supreeth Shetty','Database',0.00,2.00,0.00,NULL),(10,'ARM0064715','My Comet Africa',2308630,'Divya Kolli','Developer',0.00,1.80,0.00,NULL),(12,'APM0008238','PALMS',2207036,'Pavan Kumar','PM',0.00,2.00,0.00,NULL),(36,'	APM0009282','ARMADA',2207036,'Pavan Kumar','PM',2.50,2.00,5.00,NULL),(37,'	APM0009282','ARMADA',12345,'Nisha','Developer',3.00,1.80,5.40,NULL),(38,'	APM0009282','ARMADA',5678,'Divya','PM',1.45,2.00,2.90,NULL),(59,'	APM0008931','BIOVIA ACD',1234,'Nisha','Developer',0.50,1.80,0.90,NULL);
/*!40000 ALTER TABLE `effort_tracker` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migration_tracker`
--

DROP TABLE IF EXISTS `migration_tracker`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migration_tracker` (
  `id` int(11) DEFAULT NULL,
  `Application_ID` varchar(50) NOT NULL,
  `Application_Name` varchar(255) DEFAULT NULL,
  `Digital_Unit` varchar(100) DEFAULT NULL,
  `InHouse_Vendor` varchar(50) DEFAULT NULL,
  `Type` varchar(50) DEFAULT NULL,
  `Status` varchar(50) DEFAULT NULL,
  `RAG` varchar(10) DEFAULT NULL,
  `PM` varchar(100) DEFAULT NULL,
  `Tech_PM` varchar(100) DEFAULT NULL,
  `TDPL` varchar(100) DEFAULT NULL,
  `Developers` text DEFAULT NULL,
  `TDA_Approval_Date` date DEFAULT NULL,
  `Planned_PnP_Date` date DEFAULT NULL,
  `Actual_PnP_Date` date DEFAULT NULL,
  `Planned_PnP_Delivery_Date` date DEFAULT NULL,
  `Actual_PnP_Delivery_Date` date DEFAULT NULL,
  `Implementation_Start_Date` date DEFAULT NULL,
  `PnP_Cost` decimal(15,2) DEFAULT NULL,
  `Migration_Cost` decimal(15,2) DEFAULT NULL,
  `RL_Cost` decimal(15,2) DEFAULT NULL,
  `Prod_Deployment_Date` date DEFAULT NULL,
  `Go_Live_Month` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`Application_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migration_tracker`
--

LOCK TABLES `migration_tracker` WRITE;
/*!40000 ALTER TABLE `migration_tracker` DISABLE KEYS */;
/*!40000 ALTER TABLE `migration_tracker` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resource`
--

DROP TABLE IF EXISTS `resource`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resource` (
  `ResourceID` int(11) NOT NULL,
  `ResourceName` varchar(100) DEFAULT NULL,
  `RoleName` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`ResourceID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resource`
--

LOCK TABLES `resource` WRITE;
/*!40000 ALTER TABLE `resource` DISABLE KEYS */;
INSERT INTO `resource` VALUES (1234,'Nisha','Developer'),(5678,'Divya','PM'),(9988,'Meha','PM'),(12345,'Nisha','Developer'),(20099,'Shanmugapriya','Java Developer'),(200999,'Haritha','Developer'),(471734,'Sarojini Chettiyar','Tester'),(2009385,'Supreeth Shetty','Database'),(2207036,'Pavan Kumar','PM'),(2308630,'Divya Kolli','Developer'),(2344746,'Samrat Singh','AIMS'),(2387662,'Lokesh','PM'),(2387771,'Priya','Developer');
/*!40000 ALTER TABLE `resource` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role`
--

DROP TABLE IF EXISTS `role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role` (
  `RoleName` varchar(50) NOT NULL,
  `Rate` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`RoleName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role`
--

LOCK TABLES `role` WRITE;
/*!40000 ALTER TABLE `role` DISABLE KEYS */;
INSERT INTO `role` VALUES ('',0.00),('AIMS',1.80),('AIMS Support',1.50),('Appian Developer',2.00),('Appian Lead',2.80),('Architect',3.00),('Database',2.00),('Developer',1.80),('IICS Developer',1.90),('IICS Lead',2.40),('IICS PM',2.60),('Java Developer',1.90),('Java Lead',2.40),('Junior Developer',1.40),('Junior Tester',1.30),('PBI Developer',1.90),('PBI Lead',2.30),('PBI Manager',2.70),('PBI Sr. Developer',2.20),('PBI Tester',1.60),('PM',2.00),('Sr Tester',2.00),('Sr. UI Developer',2.20),('Tech Developer',2.00),('Test Lead',2.10),('Tester',1.60);
/*!40000 ALTER TABLE `role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_effort`
--

DROP TABLE IF EXISTS `role_effort`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_effort` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ApplicationID` varchar(50) DEFAULT NULL,
  `ResourceID` int(11) DEFAULT NULL,
  `RoleName` varchar(100) DEFAULT NULL,
  `EffortDate` date DEFAULT NULL,
  `MondayValue` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1657 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_effort`
--

LOCK TABLES `role_effort` WRITE;
/*!40000 ALTER TABLE `role_effort` DISABLE KEYS */;
INSERT INTO `role_effort` VALUES (578,'APM0008931',2344746,'AIMS','2025-04-07',0.55),(579,'APM0008931',2344746,'AIMS','2025-04-14',0.50),(580,'APM0008931',2344746,'AIMS','2025-04-21',0.50),(581,'APM0008931',2344746,'AIMS','2025-04-28',0.00),(582,'APM0008931',2344746,'AIMS','2025-05-05',0.00),(583,'APM0008931',2344746,'AIMS','2025-05-12',0.00),(584,'APM0008931',2344746,'AIMS','2025-05-19',0.00),(585,'APM0008931',2344746,'AIMS','2025-05-26',0.00),(586,'ARM0005753',2308630,'Developer','2025-04-07',0.50),(587,'ARM0005753',2308630,'Developer','2025-04-14',0.00),(588,'ARM0005753',2308630,'Developer','2025-04-21',0.00),(589,'ARM0005753',2308630,'Developer','2025-04-28',0.00),(590,'ARM0005753',2308630,'Developer','2025-05-05',0.00),(591,'ARM0005753',2308630,'Developer','2025-05-12',0.00),(592,'ARM0005753',2308630,'Developer','2025-05-19',0.00),(593,'ARM0005753',2308630,'Developer','2025-05-26',0.00),(594,'	APM0009282',2207036,'PM','2025-04-07',0.50),(595,'	APM0009282',2207036,'PM','2025-04-14',0.00),(596,'	APM0009282',2207036,'PM','2025-04-21',0.00),(597,'	APM0009282',2207036,'PM','2025-04-28',0.00),(598,'	APM0009282',2207036,'PM','2025-05-05',0.00),(599,'	APM0009282',2207036,'PM','2025-05-12',0.00),(600,'	APM0009282',2207036,'PM','2025-05-19',0.00),(601,'	APM0009282',2207036,'PM','2025-05-26',0.00),(602,'	APM0009282',12345,'Developer','2025-04-07',0.60),(603,'	APM0009282',12345,'Developer','2025-04-14',0.00),(604,'	APM0009282',12345,'Developer','2025-04-21',0.00),(605,'	APM0009282',12345,'Developer','2025-04-28',0.00),(606,'	APM0009282',12345,'Developer','2025-05-05',0.00),(607,'	APM0009282',12345,'Developer','2025-05-12',0.00),(608,'	APM0009282',12345,'Developer','2025-05-19',0.00),(609,'	APM0009282',12345,'Developer','2025-05-26',0.00),(610,'	APM0009282',5678,'PM','2025-04-07',0.29),(611,'	APM0009282',5678,'PM','2025-04-14',0.00),(612,'	APM0009282',5678,'PM','2025-04-21',0.00),(613,'	APM0009282',5678,'PM','2025-04-28',0.00),(614,'	APM0009282',5678,'PM','2025-05-05',0.00),(615,'	APM0009282',5678,'PM','2025-05-12',0.00),(616,'	APM0009282',5678,'PM','2025-05-19',0.00),(617,'	APM0009282',5678,'PM','2025-05-26',0.00),(670,'APM0008931',99,'','2025-04-07',0.00),(671,'APM0008931',99,'','2025-04-14',0.00),(672,'APM0008931',99,'','2025-04-21',0.00),(673,'APM0008931',99,'','2025-04-28',0.00),(674,'APM0008931',99,'','2025-05-05',0.00),(675,'APM0008931',99,'','2025-05-12',0.00),(676,'APM0008931',99,'','2025-05-19',0.00),(677,'APM0008931',99,'','2025-05-26',0.00),(863,'1234',12345,'Developer','2025-11-03',0.00),(864,'1234',12345,'Developer','2025-11-10',0.00),(865,'1234',12345,'Developer','2025-11-17',0.00),(866,'1234',12345,'Developer','2025-11-24',0.00),(867,'1234',12345,'Developer','2025-12-01',0.00),(868,'1234',12345,'Developer','2025-12-08',0.00),(869,'1234',12345,'Developer','2025-12-15',0.00),(870,'1234',12345,'Developer','2025-12-22',0.00),(871,'1234',12345,'Developer','2025-12-29',0.00),(872,'1234',12345,'Developer','2025-04-07',0.48),(873,'1234',12345,'Developer','2025-04-14',0.25),(874,'1234',12345,'Developer','2025-04-21',0.00),(875,'1234',12345,'Developer','2025-04-28',0.00),(876,'1234',12345,'Developer','2025-05-05',0.00),(877,'1234',12345,'Developer','2025-05-12',0.00),(878,'1234',12345,'Developer','2025-05-19',0.00),(879,'1234',12345,'Developer','2025-05-26',0.00),(880,'1234',12345,'Developer','2025-06-02',0.00),(881,'1234',12345,'Developer','2025-06-09',0.00),(882,'1234',12345,'Developer','2025-06-16',0.00),(883,'1234',12345,'Developer','2025-06-23',0.00),(884,'1234',12345,'Developer','2025-06-30',0.00),(885,'1234',12345,'Developer','2025-07-07',0.00),(886,'1234',12345,'Developer','2025-07-14',0.00),(887,'1234',12345,'Developer','2025-07-21',0.00),(888,'1234',12345,'Developer','2025-07-28',0.00),(889,'1234',12345,'Developer','2025-08-04',0.00),(890,'1234',12345,'Developer','2025-08-11',0.00),(891,'1234',12345,'Developer','2025-08-18',0.00),(892,'1234',12345,'Developer','2025-08-25',0.00),(893,'1234',12345,'Developer','2025-09-01',0.00),(894,'1234',12345,'Developer','2025-09-08',0.00),(895,'1234',12345,'Developer','2025-09-15',0.00),(896,'1234',12345,'Developer','2025-09-22',0.00),(897,'1234',12345,'Developer','2025-09-29',0.00),(898,'1234',12345,'Developer','2025-10-06',0.00),(899,'1234',12345,'Developer','2025-10-13',0.00),(900,'1234',12345,'Developer','2025-10-20',0.00),(901,'1234',12345,'Developer','2025-10-27',0.00),(967,'10',12345,'Developer','2025-11-03',0.50),(968,'10',12345,'Developer','2025-11-10',0.00),(969,'10',12345,'Developer','2025-11-17',0.00),(970,'10',12345,'Developer','2025-11-24',0.00),(971,'10',12345,'Developer','2025-12-01',0.00),(972,'10',12345,'Developer','2025-12-08',0.00),(973,'10',12345,'Developer','2025-12-15',0.00),(974,'10',12345,'Developer','2025-12-22',0.00),(975,'10',12345,'Developer','2025-12-29',0.00),(976,'	APM0008931',1234,'Developer','2025-04-07',0.10),(977,'	APM0008931',1234,'Developer','2025-04-14',0.00),(978,'	APM0008931',1234,'Developer','2025-04-21',0.00),(979,'	APM0008931',1234,'Developer','2025-04-28',0.00),(980,'	APM0008931',1234,'Developer','2025-05-05',0.00),(981,'	APM0008931',1234,'Developer','2025-05-12',0.00),(982,'	APM0008931',1234,'Developer','2025-05-19',0.00),(983,'	APM0008931',1234,'Developer','2025-05-26',0.00),(984,'	APM0008931',1234,'Developer','2025-06-02',0.00),(985,'	APM0008931',1234,'Developer','2025-06-09',0.00),(986,'	APM0008931',1234,'Developer','2025-06-16',0.00),(987,'	APM0008931',1234,'Developer','2025-06-23',0.00),(988,'	APM0008931',1234,'Developer','2025-06-30',0.00),(989,'	APM0008931',1234,'Developer','2025-07-07',0.00),(990,'	APM0008931',1234,'Developer','2025-07-14',0.00),(991,'	APM0008931',1234,'Developer','2025-07-21',0.00),(992,'	APM0008931',1234,'Developer','2025-07-28',0.00),(993,'	APM0008931',1234,'Developer','2025-08-04',0.00),(994,'	APM0008931',1234,'Developer','2025-08-11',0.00),(995,'	APM0008931',1234,'Developer','2025-08-18',0.00),(996,'	APM0008931',1234,'Developer','2025-08-25',0.00),(997,'	APM0008931',1234,'Developer','2025-09-01',0.00),(998,'	APM0008931',1234,'Developer','2025-09-08',0.00),(999,'	APM0008931',1234,'Developer','2025-09-15',0.00),(1000,'	APM0008931',1234,'Developer','2025-09-22',0.00),(1001,'	APM0008931',1234,'Developer','2025-09-29',0.00),(1002,'	APM0008931',1234,'Developer','2025-10-06',0.00),(1003,'	APM0008931',1234,'Developer','2025-10-13',0.00),(1004,'	APM0008931',1234,'Developer','2025-10-20',0.00),(1005,'	APM0008931',1234,'Developer','2025-10-27',0.00),(1006,'	APM0008931',1234,'Developer','2025-11-03',0.00),(1007,'	APM0008931',1234,'Developer','2025-11-10',0.00),(1008,'	APM0008931',1234,'Developer','2025-11-17',0.00),(1009,'	APM0008931',1234,'Developer','2025-11-24',0.00),(1010,'	APM0008931',1234,'Developer','2025-12-01',0.00),(1011,'	APM0008931',1234,'Developer','2025-12-08',0.00),(1012,'	APM0008931',1234,'Developer','2025-12-15',0.00),(1013,'	APM0008931',1234,'Developer','2025-12-22',0.00),(1014,'	APM0008931',1234,'Developer','2025-12-29',0.00),(1015,'APM0008931',2344746,'AIMS','2025-06-02',0.00),(1016,'APM0008931',2344746,'AIMS','2025-06-09',0.00),(1017,'APM0008931',2344746,'AIMS','2025-06-16',0.00),(1018,'APM0008931',2344746,'AIMS','2025-06-23',0.00),(1019,'APM0008931',2344746,'AIMS','2025-06-30',0.00),(1020,'APM0008931',2344746,'AIMS','2025-07-07',0.00),(1021,'APM0008931',2344746,'AIMS','2025-07-14',0.00),(1022,'APM0008931',2344746,'AIMS','2025-07-21',0.00),(1023,'APM0008931',2344746,'AIMS','2025-07-28',0.00),(1024,'APM0008931',2344746,'AIMS','2025-08-04',0.00),(1025,'APM0008931',2344746,'AIMS','2025-08-11',0.00),(1026,'APM0008931',2344746,'AIMS','2025-08-18',0.00),(1027,'APM0008931',2344746,'AIMS','2025-08-25',0.00),(1028,'APM0008931',2344746,'AIMS','2025-09-01',0.00),(1029,'APM0008931',2344746,'AIMS','2025-09-08',0.00),(1030,'APM0008931',2344746,'AIMS','2025-09-15',0.00),(1031,'APM0008931',2344746,'AIMS','2025-09-22',0.00),(1032,'APM0008931',2344746,'AIMS','2025-09-29',0.00),(1033,'APM0008931',2344746,'AIMS','2025-10-06',0.00),(1034,'APM0008931',2344746,'AIMS','2025-10-13',0.00),(1035,'APM0008931',2344746,'AIMS','2025-10-20',0.00),(1036,'APM0008931',2344746,'AIMS','2025-10-27',0.00),(1037,'APM0008931',2344746,'AIMS','2025-11-03',0.00),(1038,'APM0008931',2344746,'AIMS','2025-11-10',0.00),(1039,'APM0008931',2344746,'AIMS','2025-11-17',0.00),(1040,'APM0008931',2344746,'AIMS','2025-11-24',0.00),(1041,'APM0008931',2344746,'AIMS','2025-12-01',0.00),(1042,'APM0008931',2344746,'AIMS','2025-12-08',0.00),(1043,'APM0008931',2344746,'AIMS','2025-12-15',0.00),(1044,'APM0008931',2344746,'AIMS','2025-12-22',0.00),(1045,'APM0008931',2344746,'AIMS','2025-12-29',0.00),(1085,'1234',12,'Developer','2025-04-07',0.02),(1086,'1234',12,'Developer','2025-04-14',0.00),(1087,'1234',12,'Developer','2025-04-21',0.00),(1088,'1234',12,'Developer','2025-04-28',0.00),(1089,'1234',12,'Developer','2025-05-05',0.00),(1090,'1234',12,'Developer','2025-05-12',0.00),(1091,'1234',12,'Developer','2025-05-19',0.00),(1092,'1234',12,'Developer','2025-05-26',0.00),(1093,'1234',12,'Developer','2025-06-02',0.00),(1094,'1234',12,'Developer','2025-06-09',0.00),(1095,'1234',12,'Developer','2025-06-16',0.00),(1096,'1234',12,'Developer','2025-06-23',0.00),(1097,'1234',12,'Developer','2025-06-30',0.00),(1098,'1234',12,'Developer','2025-07-07',0.00),(1099,'1234',12,'Developer','2025-07-14',0.00),(1100,'1234',12,'Developer','2025-07-21',0.00),(1101,'1234',12,'Developer','2025-07-28',0.00),(1102,'1234',12,'Developer','2025-08-04',0.00),(1103,'1234',12,'Developer','2025-08-11',0.00),(1104,'1234',12,'Developer','2025-08-18',0.00),(1105,'1234',12,'Developer','2025-08-25',0.00),(1106,'1234',12,'Developer','2025-09-01',0.00),(1107,'1234',12,'Developer','2025-09-08',0.00),(1108,'1234',12,'Developer','2025-09-15',0.00),(1109,'1234',12,'Developer','2025-09-22',0.00),(1110,'1234',12,'Developer','2025-09-29',0.00),(1111,'1234',12,'Developer','2025-10-06',0.00),(1112,'1234',12,'Developer','2025-10-13',0.00),(1113,'1234',12,'Developer','2025-10-20',0.00),(1114,'1234',12,'Developer','2025-10-27',0.00),(1115,'1234',12,'Developer','2025-11-03',0.00),(1116,'1234',12,'Developer','2025-11-10',0.00),(1117,'1234',12,'Developer','2025-11-17',0.00),(1118,'1234',12,'Developer','2025-11-24',0.00),(1119,'1234',12,'Developer','2025-12-01',0.00),(1120,'1234',12,'Developer','2025-12-08',0.00),(1121,'1234',12,'Developer','2025-12-15',0.00),(1122,'1234',12,'Developer','2025-12-22',0.00),(1123,'1234',12,'Developer','2025-12-29',0.00),(1163,'1234',2387771,'Developer','2025-04-07',0.50),(1164,'1234',2387771,'Developer','2025-04-14',0.00),(1165,'1234',2387771,'Developer','2025-04-21',0.00),(1166,'1234',2387771,'Developer','2025-04-28',0.00),(1167,'1234',2387771,'Developer','2025-05-05',0.00),(1168,'1234',2387771,'Developer','2025-05-12',0.00),(1169,'1234',2387771,'Developer','2025-05-19',0.00),(1170,'1234',2387771,'Developer','2025-05-26',0.00),(1171,'1234',2387771,'Developer','2025-06-02',0.00),(1172,'1234',2387771,'Developer','2025-06-09',0.00),(1173,'1234',2387771,'Developer','2025-06-16',0.00),(1174,'1234',2387771,'Developer','2025-06-23',0.00),(1175,'1234',2387771,'Developer','2025-06-30',0.00),(1176,'1234',2387771,'Developer','2025-07-07',0.00),(1177,'1234',2387771,'Developer','2025-07-14',0.00),(1178,'1234',2387771,'Developer','2025-07-21',0.00),(1179,'1234',2387771,'Developer','2025-07-28',0.00),(1180,'1234',2387771,'Developer','2025-08-04',0.00),(1181,'1234',2387771,'Developer','2025-08-11',0.00),(1182,'1234',2387771,'Developer','2025-08-18',0.00),(1183,'1234',2387771,'Developer','2025-08-25',0.00),(1184,'1234',2387771,'Developer','2025-09-01',0.00),(1185,'1234',2387771,'Developer','2025-09-08',0.00),(1186,'1234',2387771,'Developer','2025-09-15',0.00),(1187,'1234',2387771,'Developer','2025-09-22',0.00),(1188,'1234',2387771,'Developer','2025-09-29',0.00),(1189,'1234',2387771,'Developer','2025-10-06',0.00),(1190,'1234',2387771,'Developer','2025-10-13',0.00),(1191,'1234',2387771,'Developer','2025-10-20',0.00),(1192,'1234',2387771,'Developer','2025-10-27',0.00),(1193,'1234',2387771,'Developer','2025-11-03',0.00),(1194,'1234',2387771,'Developer','2025-11-10',0.00),(1195,'1234',2387771,'Developer','2025-11-17',0.00),(1196,'1234',2387771,'Developer','2025-11-24',0.00),(1197,'1234',2387771,'Developer','2025-12-01',0.00),(1198,'1234',2387771,'Developer','2025-12-08',0.00),(1199,'1234',2387771,'Developer','2025-12-15',0.00),(1200,'1234',2387771,'Developer','2025-12-22',0.00),(1201,'1234',2387771,'Developer','2025-12-29',0.00),(1345,'APM0074963',1234,'Developer','2025-04-07',0.50),(1346,'APM0074963',1234,'Developer','2025-04-14',0.00),(1347,'APM0074963',1234,'Developer','2025-04-21',0.00),(1348,'APM0074963',1234,'Developer','2025-04-28',0.00),(1349,'APM0074963',1234,'Developer','2025-05-05',0.00),(1350,'APM0074963',1234,'Developer','2025-05-12',0.00),(1351,'APM0074963',1234,'Developer','2025-05-19',0.00),(1352,'APM0074963',1234,'Developer','2025-05-26',0.00),(1353,'APM0074963',1234,'Developer','2025-06-02',0.00),(1354,'APM0074963',1234,'Developer','2025-06-09',0.00),(1355,'APM0074963',1234,'Developer','2025-06-16',0.00),(1356,'APM0074963',1234,'Developer','2025-06-23',0.00),(1357,'APM0074963',1234,'Developer','2025-06-30',0.00),(1358,'APM0074963',1234,'Developer','2025-07-07',0.00),(1359,'APM0074963',1234,'Developer','2025-07-14',0.00),(1360,'APM0074963',1234,'Developer','2025-07-21',0.00),(1361,'APM0074963',1234,'Developer','2025-07-28',0.00),(1362,'APM0074963',1234,'Developer','2025-08-04',0.00),(1363,'APM0074963',1234,'Developer','2025-08-11',0.00),(1364,'APM0074963',1234,'Developer','2025-08-18',0.00),(1365,'APM0074963',1234,'Developer','2025-08-25',0.00),(1366,'APM0074963',1234,'Developer','2025-09-01',0.00),(1367,'APM0074963',1234,'Developer','2025-09-08',0.00),(1368,'APM0074963',1234,'Developer','2025-09-15',0.00),(1369,'APM0074963',1234,'Developer','2025-09-22',0.00),(1370,'APM0074963',1234,'Developer','2025-09-29',0.00),(1371,'APM0074963',1234,'Developer','2025-10-06',0.00),(1372,'APM0074963',1234,'Developer','2025-10-13',0.00),(1373,'APM0074963',1234,'Developer','2025-10-20',0.00),(1374,'APM0074963',1234,'Developer','2025-10-27',0.00),(1375,'APM0074963',1234,'Developer','2025-11-03',0.00),(1376,'APM0074963',1234,'Developer','2025-11-10',0.00),(1377,'APM0074963',1234,'Developer','2025-11-17',0.00),(1378,'APM0074963',1234,'Developer','2025-11-24',0.00),(1379,'APM0074963',1234,'Developer','2025-12-01',0.00),(1380,'APM0074963',1234,'Developer','2025-12-08',0.00),(1381,'APM0074963',1234,'Developer','2025-12-15',0.00),(1382,'APM0074963',1234,'Developer','2025-12-22',0.00),(1383,'APM0074963',1234,'Developer','2025-12-29',0.00),(1384,'APM0054868',1234,'Developer','2025-04-07',0.50),(1385,'APM0054868',1234,'Developer','2025-04-14',0.00),(1386,'APM0054868',1234,'Developer','2025-04-21',0.00),(1387,'APM0054868',1234,'Developer','2025-04-28',0.00),(1388,'APM0054868',1234,'Developer','2025-05-05',0.00),(1389,'APM0054868',1234,'Developer','2025-05-12',0.00),(1390,'APM0054868',1234,'Developer','2025-05-19',0.00),(1391,'APM0054868',1234,'Developer','2025-05-26',0.00),(1392,'APM0054868',1234,'Developer','2025-06-02',0.00),(1393,'APM0054868',1234,'Developer','2025-06-09',0.00),(1394,'APM0054868',1234,'Developer','2025-06-16',0.00),(1395,'APM0054868',1234,'Developer','2025-06-23',0.00),(1396,'APM0054868',1234,'Developer','2025-06-30',0.00),(1397,'APM0054868',1234,'Developer','2025-07-07',0.00),(1398,'APM0054868',1234,'Developer','2025-07-14',0.00),(1399,'APM0054868',1234,'Developer','2025-07-21',0.00),(1400,'APM0054868',1234,'Developer','2025-07-28',0.00),(1401,'APM0054868',1234,'Developer','2025-08-04',0.00),(1402,'APM0054868',1234,'Developer','2025-08-11',0.00),(1403,'APM0054868',1234,'Developer','2025-08-18',0.00),(1404,'APM0054868',1234,'Developer','2025-08-25',0.00),(1405,'APM0054868',1234,'Developer','2025-09-01',0.00),(1406,'APM0054868',1234,'Developer','2025-09-08',0.00),(1407,'APM0054868',1234,'Developer','2025-09-15',0.00),(1408,'APM0054868',1234,'Developer','2025-09-22',0.00),(1409,'APM0054868',1234,'Developer','2025-09-29',0.00),(1410,'APM0054868',1234,'Developer','2025-10-06',0.00),(1411,'APM0054868',1234,'Developer','2025-10-13',0.00),(1412,'APM0054868',1234,'Developer','2025-10-20',0.00),(1413,'APM0054868',1234,'Developer','2025-10-27',0.00),(1414,'APM0054868',1234,'Developer','2025-11-03',0.00),(1415,'APM0054868',1234,'Developer','2025-11-10',0.00),(1416,'APM0054868',1234,'Developer','2025-11-17',0.00),(1417,'APM0054868',1234,'Developer','2025-11-24',0.00),(1418,'APM0054868',1234,'Developer','2025-12-01',0.00),(1419,'APM0054868',1234,'Developer','2025-12-08',0.00),(1420,'APM0054868',1234,'Developer','2025-12-15',0.00),(1421,'APM0054868',1234,'Developer','2025-12-22',0.00),(1422,'APM0054868',1234,'Developer','2025-12-29',0.00),(1423,'APM0054868',12,'Developer','2025-04-07',0.50),(1424,'APM0054868',12,'Developer','2025-04-14',0.00),(1425,'APM0054868',12,'Developer','2025-04-21',0.00),(1426,'APM0054868',12,'Developer','2025-04-28',0.00),(1427,'APM0054868',12,'Developer','2025-05-05',0.00),(1428,'APM0054868',12,'Developer','2025-05-12',0.00),(1429,'APM0054868',12,'Developer','2025-05-19',0.00),(1430,'APM0054868',12,'Developer','2025-05-26',0.00),(1431,'APM0054868',12,'Developer','2025-06-02',0.00),(1432,'APM0054868',12,'Developer','2025-06-09',0.00),(1433,'APM0054868',12,'Developer','2025-06-16',0.00),(1434,'APM0054868',12,'Developer','2025-06-23',0.00),(1435,'APM0054868',12,'Developer','2025-06-30',0.00),(1436,'APM0054868',12,'Developer','2025-07-07',0.00),(1437,'APM0054868',12,'Developer','2025-07-14',0.00),(1438,'APM0054868',12,'Developer','2025-07-21',0.00),(1439,'APM0054868',12,'Developer','2025-07-28',0.00),(1440,'APM0054868',12,'Developer','2025-08-04',0.00),(1441,'APM0054868',12,'Developer','2025-08-11',0.00),(1442,'APM0054868',12,'Developer','2025-08-18',0.00),(1443,'APM0054868',12,'Developer','2025-08-25',0.00),(1444,'APM0054868',12,'Developer','2025-09-01',0.00),(1445,'APM0054868',12,'Developer','2025-09-08',0.00),(1446,'APM0054868',12,'Developer','2025-09-15',0.00),(1447,'APM0054868',12,'Developer','2025-09-22',0.00),(1448,'APM0054868',12,'Developer','2025-09-29',0.00),(1449,'APM0054868',12,'Developer','2025-10-06',0.00),(1450,'APM0054868',12,'Developer','2025-10-13',0.00),(1451,'APM0054868',12,'Developer','2025-10-20',0.00),(1452,'APM0054868',12,'Developer','2025-10-27',0.00),(1453,'APM0054868',12,'Developer','2025-11-03',0.00),(1454,'APM0054868',12,'Developer','2025-11-10',0.00),(1455,'APM0054868',12,'Developer','2025-11-17',0.00),(1456,'APM0054868',12,'Developer','2025-11-24',0.00),(1457,'APM0054868',12,'Developer','2025-12-01',0.00),(1458,'APM0054868',12,'Developer','2025-12-08',0.00),(1459,'APM0054868',12,'Developer','2025-12-15',0.00),(1460,'APM0054868',12,'Developer','2025-12-22',0.00),(1461,'APM0054868',12,'Developer','2025-12-29',0.00),(1488,'APM000999',1234,'Developer','2025-10-06',0.70),(1489,'APM000999',1234,'Developer','2025-10-13',0.25),(1490,'APM000999',1234,'Developer','2025-10-20',0.11),(1491,'APM000999',1234,'Developer','2025-10-27',0.10),(1492,'APM000999',1234,'Developer','2025-11-03',0.10),(1493,'APM000999',1234,'Developer','2025-11-10',0.89),(1494,'APM000999',1234,'Developer','2025-11-17',0.56),(1495,'APM000999',1234,'Developer','2025-11-24',0.11),(1496,'APM000999',1234,'Developer','2025-12-01',0.14),(1497,'APM000999',1234,'Developer','2025-12-08',0.13),(1498,'APM000999',1234,'Developer','2025-12-15',0.22),(1499,'APM000999',1234,'Developer','2025-12-22',0.23),(1500,'APM000999',1234,'Developer','2025-12-29',0.00),(1501,'APM0099',5678,'PM','2025-10-06',0.67),(1502,'APM0099',5678,'PM','2025-10-13',0.34),(1503,'APM0099',5678,'PM','2025-10-20',0.78),(1504,'APM0099',5678,'PM','2025-10-27',0.45),(1505,'APM0099',5678,'PM','2025-11-03',0.12),(1506,'APM0099',5678,'PM','2025-11-10',0.12),(1507,'APM0099',5678,'PM','2025-11-17',0.13),(1508,'APM0099',5678,'PM','2025-11-24',0.12),(1509,'APM0099',5678,'PM','2025-12-01',0.22),(1510,'APM0099',5678,'PM','2025-12-08',0.00),(1511,'APM0099',5678,'PM','2025-12-15',0.00),(1512,'APM0099',5678,'PM','2025-12-22',0.00),(1513,'APM0099',5678,'PM','2025-12-29',0.00),(1514,'3',1234,'Developer','2025-11-03',0.00),(1515,'3',1234,'Developer','2025-11-10',0.00),(1516,'3',1234,'Developer','2025-11-17',0.00),(1517,'3',1234,'Developer','2025-11-24',0.00),(1518,'3',1234,'Developer','2025-12-01',0.00),(1519,'3',1234,'Developer','2025-12-08',0.00),(1520,'3',1234,'Developer','2025-12-15',0.00),(1521,'3',1234,'Developer','2025-12-22',0.00),(1522,'3',1234,'Developer','2025-12-29',0.00),(1523,'3',1234,'Developer','2025-04-07',0.13),(1524,'3',1234,'Developer','2025-04-14',0.00),(1525,'3',1234,'Developer','2025-04-21',0.00),(1526,'3',1234,'Developer','2025-04-28',0.00),(1527,'3',1234,'Developer','2025-05-05',0.00),(1528,'3',1234,'Developer','2025-05-12',0.00),(1529,'3',1234,'Developer','2025-05-19',0.00),(1530,'3',1234,'Developer','2025-05-26',0.00),(1531,'3',1234,'Developer','2025-06-02',0.00),(1532,'3',1234,'Developer','2025-06-09',0.00),(1533,'3',1234,'Developer','2025-06-16',0.00),(1534,'3',1234,'Developer','2025-06-23',0.00),(1535,'3',1234,'Developer','2025-06-30',0.00),(1536,'3',1234,'Developer','2025-07-07',0.00),(1537,'3',1234,'Developer','2025-07-14',0.00),(1538,'3',1234,'Developer','2025-07-21',0.00),(1539,'3',1234,'Developer','2025-07-28',0.00),(1540,'3',1234,'Developer','2025-08-04',0.00),(1541,'3',1234,'Developer','2025-08-11',0.00),(1542,'3',1234,'Developer','2025-08-18',0.00),(1543,'3',1234,'Developer','2025-08-25',0.00),(1544,'3',1234,'Developer','2025-09-01',0.00),(1545,'3',1234,'Developer','2025-09-08',0.00),(1546,'3',1234,'Developer','2025-09-15',0.00),(1547,'3',1234,'Developer','2025-09-22',0.00),(1548,'3',1234,'Developer','2025-09-29',0.00),(1549,'3',1234,'Developer','2025-10-06',0.00),(1550,'3',1234,'Developer','2025-10-13',0.00),(1551,'3',1234,'Developer','2025-10-20',0.00),(1552,'3',1234,'Developer','2025-10-27',0.00),(1553,'123',1234,'Developer','2025-11-03',0.00),(1554,'123',1234,'Developer','2025-11-10',0.00),(1555,'123',1234,'Developer','2025-11-17',0.00),(1556,'123',1234,'Developer','2025-11-24',0.00),(1557,'123',1234,'Developer','2025-12-01',0.00),(1558,'123',1234,'Developer','2025-12-08',0.00),(1559,'123',1234,'Developer','2025-12-15',0.00),(1560,'123',1234,'Developer','2025-12-22',0.00),(1561,'123',1234,'Developer','2025-12-29',0.00),(1562,'123',1234,'Developer','2025-04-07',0.50),(1563,'123',1234,'Developer','2025-04-14',0.00),(1564,'123',1234,'Developer','2025-04-21',0.00),(1565,'123',1234,'Developer','2025-04-28',0.00),(1566,'123',1234,'Developer','2025-05-05',0.00),(1567,'123',1234,'Developer','2025-05-12',0.00),(1568,'123',1234,'Developer','2025-05-19',0.00),(1569,'123',1234,'Developer','2025-05-26',0.00),(1570,'123',1234,'Developer','2025-06-02',0.00),(1571,'123',1234,'Developer','2025-06-09',0.00),(1572,'123',1234,'Developer','2025-06-16',0.00),(1573,'123',1234,'Developer','2025-06-23',0.00),(1574,'123',1234,'Developer','2025-06-30',0.00),(1575,'123',1234,'Developer','2025-07-07',0.00),(1576,'123',1234,'Developer','2025-07-14',0.00),(1577,'123',1234,'Developer','2025-07-21',0.00),(1578,'123',1234,'Developer','2025-07-28',0.00),(1579,'123',1234,'Developer','2025-08-04',0.00),(1580,'123',1234,'Developer','2025-08-11',0.00),(1581,'123',1234,'Developer','2025-08-18',0.00),(1582,'123',1234,'Developer','2025-08-25',0.00),(1583,'123',1234,'Developer','2025-09-01',0.00),(1584,'123',1234,'Developer','2025-09-08',0.00),(1585,'123',1234,'Developer','2025-09-15',0.00),(1586,'123',1234,'Developer','2025-09-22',0.00),(1587,'123',1234,'Developer','2025-09-29',0.00),(1588,'123',1234,'Developer','2025-10-06',0.00),(1589,'123',1234,'Developer','2025-10-13',0.00),(1590,'123',1234,'Developer','2025-10-20',0.00),(1591,'123',1234,'Developer','2025-10-27',0.00),(1592,'APM000999',1234,'Developer','2025-10-06',0.70),(1593,'APM000999',1234,'Developer','2025-10-13',0.25),(1594,'APM000999',1234,'Developer','2025-10-20',0.11),(1595,'APM000999',1234,'Developer','2025-10-27',0.10),(1596,'APM000999',1234,'Developer','2025-11-03',0.10),(1597,'APM000999',1234,'Developer','2025-11-10',0.89),(1598,'APM000999',1234,'Developer','2025-11-17',0.56),(1599,'APM000999',1234,'Developer','2025-11-24',0.11),(1600,'APM000999',1234,'Developer','2025-12-01',0.14),(1601,'APM000999',1234,'Developer','2025-12-08',0.13),(1602,'APM000999',1234,'Developer','2025-12-15',0.22),(1603,'APM000999',1234,'Developer','2025-12-22',0.23),(1604,'APM000999',1234,'Developer','2025-12-29',0.00),(1605,'APM0099',5678,'PM','2025-10-06',0.67),(1606,'APM0099',5678,'PM','2025-10-13',0.34),(1607,'APM0099',5678,'PM','2025-10-20',0.78),(1608,'APM0099',5678,'PM','2025-10-27',0.45),(1609,'APM0099',5678,'PM','2025-11-03',0.12),(1610,'APM0099',5678,'PM','2025-11-10',0.12),(1611,'APM0099',5678,'PM','2025-11-17',0.13),(1612,'APM0099',5678,'PM','2025-11-24',0.12),(1613,'APM0099',5678,'PM','2025-12-01',0.22),(1614,'APM0099',5678,'PM','2025-12-08',0.00),(1615,'APM0099',5678,'PM','2025-12-15',0.00),(1616,'APM0099',5678,'PM','2025-12-22',0.00),(1617,'APM0099',5678,'PM','2025-12-29',0.00);
/*!40000 ALTER TABLE `role_effort` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tracker_dates`
--

DROP TABLE IF EXISTS `tracker_dates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tracker_dates` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `ApplicationID` varchar(100) NOT NULL,
  `TDAApprovalDate` date DEFAULT NULL,
  `PlannedPnPDate` date DEFAULT NULL,
  `ActualPnPDate` date DEFAULT NULL,
  `PlannedPnPDeliveryDate` date DEFAULT NULL,
  `ActualPnPDeliveryDate` date DEFAULT NULL,
  `ImplementationStartDate` date DEFAULT NULL,
  `ProdDeploymentDate` date DEFAULT NULL,
  `GoLiveMonth` date DEFAULT NULL,
  PRIMARY KEY (`Id`),
  KEY `ApplicationID` (`ApplicationID`),
  CONSTRAINT `tracker_dates_ibfk_1` FOREIGN KEY (`ApplicationID`) REFERENCES `application` (`ApplicationID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tracker_dates`
--

LOCK TABLES `tracker_dates` WRITE;
/*!40000 ALTER TABLE `tracker_dates` DISABLE KEYS */;
/*!40000 ALTER TABLE `tracker_dates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `upgrade_tracker`
--

DROP TABLE IF EXISTS `upgrade_tracker`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `upgrade_tracker` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `APM_ID` varchar(50) NOT NULL,
  `APP_NAME` varchar(100) NOT NULL,
  `DIGITAL_UNIT` varchar(100) NOT NULL,
  `UPGRADE_FACTORY_ARRIVAL_DATE` date NOT NULL,
  `PNP_COMPLETION_DATE` date NOT NULL,
  `STATUS` varchar(50) NOT NULL,
  `BLOCKER_COMMENTS` text NOT NULL,
  `OLD_UPGRADE_FACTORY_ARRIVAL_DATE` date DEFAULT NULL,
  `OLD_PNP_COMPLETION_DATE` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=121 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `upgrade_tracker`
--

LOCK TABLES `upgrade_tracker` WRITE;
/*!40000 ALTER TABLE `upgrade_tracker` DISABLE KEYS */;
INSERT INTO `upgrade_tracker` VALUES (102,'APM0055933','SFD-ZVS-FF','Digital M&S','2025-04-16','2025-05-13','Pnp-in progress','23-May: Revised PnP to be shared and submitted with AO\n16-May: AO confirmed the scope, PnP activities initiated\n09-May: AO not clear on scope of servers involved and environment, requires time to confirm post which we can initiate PnP activities\n02-May: AO looking to scope of servers along with TDR comments, need to align on same to initiate PnP\n25-Apr: alignment call initiated, AO looking for server in scope to be checked\n18-Apr: To initiate PnP',NULL,NULL),(107,'APM0054868','IBM ILMT','Digital Tech','2025-05-14','2025-06-04','Pnp-completed','23-May: Yet to initiate PnP',NULL,NULL),(109,'APM0074963','SK Site Access Control Software','Digital GBU','2025-05-21','2025-06-11','Pnp-completed','23-May: Yet to initiate PnP',NULL,NULL),(110,'APM0075419','IVTRACER Vitry CRV','Digital CF','2025-05-14','2025-06-04','Pnp-blocked','23-May: Yet to initiate PnP',NULL,NULL);
/*!40000 ALTER TABLE `upgrade_tracker` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-18 19:57:50
