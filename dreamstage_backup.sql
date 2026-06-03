--
-- PostgreSQL database dump
--

\restrict 8Yo9v7ZkringVtFqwoM7chXyIwGVWIWKHxJ7t42dMPeMEbvDazGHJNn1TsNJj4h

-- Dumped from database version 16.12
-- Dumped by pg_dump version 16.12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.booking_status AS ENUM (
    'provisional',
    'confirmed'
);


ALTER TYPE public.booking_status OWNER TO postgres;

--
-- Name: event_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.event_status AS ENUM (
    'draft',
    'approved',
    'locked'
);


ALTER TYPE public.event_status OWNER TO postgres;

--
-- Name: payment_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_type AS ENUM (
    'deposit',
    'final'
);


ALTER TYPE public.payment_type OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'planner'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: approvals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approvals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    client_identifier character varying(255) NOT NULL,
    scene_version_ref integer NOT NULL,
    approved_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.approvals OWNER TO postgres;

--
-- Name: assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(50) NOT NULL,
    default_unit_price numeric(12,2) NOT NULL,
    stock_quantity integer DEFAULT 0 NOT NULL,
    model_ref text,
    thumbnail_url text,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    file_url text
);


ALTER TABLE public.assets OWNER TO postgres;

--
-- Name: budget_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.budget_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price_override numeric(12,2),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.budget_items OWNER TO postgres;

--
-- Name: checklist_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.checklist_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    due_date date,
    is_complete boolean DEFAULT false NOT NULL,
    is_system_generated boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.checklist_items OWNER TO postgres;

--
-- Name: client_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_comments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    parent_comment_id uuid,
    client_identifier character varying(255) NOT NULL,
    content text NOT NULL,
    is_planner_reply boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.client_comments OWNER TO postgres;

--
-- Name: client_requirements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid,
    share_token character varying(255) NOT NULL,
    client_name character varying(255),
    client_email character varying(255),
    event_type character varying(100),
    event_date date,
    guest_count integer,
    venue_type character varying(100),
    hall_preference character varying(255),
    seating_style character varying(100),
    seating_notes text,
    meal_preference character varying(100),
    lighting_preference character varying(100),
    decoration_preference character varying(255),
    addons text[],
    budget_range character varying(100),
    special_requests text,
    is_submitted boolean DEFAULT false,
    submitted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.client_requirements OWNER TO postgres;

--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    planner_id uuid NOT NULL,
    venue_template_id uuid,
    name character varying(255) NOT NULL,
    event_type character varying(50) NOT NULL,
    event_date date NOT NULL,
    status public.event_status DEFAULT 'draft'::public.event_status NOT NULL,
    share_token uuid DEFAULT public.uuid_generate_v4(),
    share_password_hash character varying(255),
    budget_ceiling numeric(12,2),
    show_budget_details boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: inquiries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    planner_id uuid,
    share_token character varying(255) NOT NULL,
    client_name character varying(255),
    client_email character varying(255),
    event_type character varying(100),
    event_date date,
    guest_count integer,
    venue_type character varying(100),
    hall_preference character varying(255),
    seating_style character varying(100),
    seating_notes text,
    meal_preference character varying(100),
    addons text[],
    budget_range character varying(100),
    lighting_preference character varying(100),
    decoration_preference character varying(255),
    special_requests text,
    inspiration_images text[],
    is_submitted boolean DEFAULT false,
    submitted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    shortlisted_venue_ids uuid[] DEFAULT '{}'::uuid[],
    selected_venue_id uuid,
    venue_selection_token character varying(255),
    venue_selected_at timestamp with time zone,
    venue_hold_expires_at timestamp with time zone,
    converted_event_id uuid,
    converted_at timestamp with time zone
);


ALTER TABLE public.inquiries OWNER TO postgres;

--
-- Name: milestones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.milestones (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    target_date date NOT NULL,
    is_complete boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.milestones OWNER TO postgres;

--
-- Name: scene_layouts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scene_layouts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    scene_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    locked boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.scene_layouts OWNER TO postgres;

--
-- Name: stock_reservations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_reservations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    quantity_reserved integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.stock_reservations OWNER TO postgres;

--
-- Name: timeline_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timeline_entries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    time_slot time without time zone NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.timeline_entries OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role public.user_role DEFAULT 'planner'::public.user_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: vendor_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendor_payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    vendor_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_type public.payment_type NOT NULL,
    paid_at date NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.vendor_payments OWNER TO postgres;

--
-- Name: vendor_quotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendor_quotes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    vendor_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_url text NOT NULL,
    file_size integer NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.vendor_quotes OWNER TO postgres;

--
-- Name: vendors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendors (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    company character varying(255),
    email character varying(255),
    phone character varying(50),
    category character varying(50) NOT NULL,
    quote_url text,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    total_contract_amount numeric(12,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.vendors OWNER TO postgres;

--
-- Name: venue_bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.venue_bookings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    venue_template_id uuid NOT NULL,
    booking_date date NOT NULL,
    status public.booking_status DEFAULT 'provisional'::public.booking_status NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.venue_bookings OWNER TO postgres;

--
-- Name: venue_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.venue_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(50) NOT NULL,
    capacity integer NOT NULL,
    thumbnail_url text,
    model_ref text,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    price_per_head numeric(12,2),
    location character varying(500),
    gallery_images jsonb DEFAULT '[]'::jsonb NOT NULL,
    video_url text
);


ALTER TABLE public.venue_templates OWNER TO postgres;

--
-- Name: COLUMN venue_templates.price_per_head; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.venue_templates.price_per_head IS 'Optional PKR price per guest for admin venue cards';


--
-- Name: COLUMN venue_templates.gallery_images; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.venue_templates.gallery_images IS 'JSON array of image URL strings';


--
-- Name: COLUMN venue_templates.video_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.venue_templates.video_url IS 'YouTube watch or share URL for public venue detail embed';


--
-- Data for Name: approvals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approvals (id, event_id, client_identifier, scene_version_ref, approved_at) FROM stdin;
\.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assets (id, name, category, default_unit_price, stock_quantity, model_ref, thumbnail_url, description, is_active, created_at, updated_at, file_url) FROM stdin;
4290c434-6309-4a4e-a7d5-65c6925c324f	Royal green sofa	seating	500.00	999	88cebf5a-4809-49f5-b8d6-99fc9ca6399d.glb	/uploads/assets/8c9d206e-a87f-48a4-a8c1-2c01b299cf13.png	\N	t	2026-04-20 16:57:27.457637+05	2026-04-20 16:57:27.457637+05	/models/88cebf5a-4809-49f5-b8d6-99fc9ca6399d.glb
0ba77c52-f231-48f3-a3ad-2f1232adaf79	Floral vase	decor	200.00	999	4c210a34-70e8-4528-8bb7-b3a86fcbe44d.glb	/uploads/assets/8d9e3a7b-4d7f-4b15-aec6-9abe5720a63e.png	\N	t	2026-04-20 17:23:28.859189+05	2026-04-20 17:23:28.859189+05	/models/4c210a34-70e8-4528-8bb7-b3a86fcbe44d.glb
6a114238-7b07-4624-acf1-d96e2fdb087d	white flower in white vase	decor	300.00	999	497ac580-ca2b-4a9a-8cd7-fa23a9cad994.glb	/uploads/assets/a277cf76-ab3b-4048-af48-e4ff56b3084c.png	\N	t	2026-04-20 17:46:09.075843+05	2026-04-20 17:46:09.075843+05	/models/497ac580-ca2b-4a9a-8cd7-fa23a9cad994.glb
d848f2a9-9c07-4701-b7c6-476eea0b09e3	Table Runner (Sequin)	decor	2000.00	150	\N	\N	Sparkly sequin table runner, various colors	t	2026-02-23 17:57:17.510818+05	2026-02-23 17:57:17.510818+05	\N
485cdf57-b2e3-4a8a-8928-77e4f8bc4c92	Stage Platform (4x8)	staging	35000.00	8	\N	\N	4x8 foot modular stage platform section	t	2026-02-23 17:57:17.512968+05	2026-02-23 17:57:17.512968+05	\N
f2ef6b9c-cb7f-4e63-b7aa-bce37aa35be1	Stage Riser (2x4)	staging	12000.00	20	\N	\N	2x4 foot stage riser for multi-level staging	t	2026-02-23 17:57:17.514535+05	2026-02-23 17:57:17.514535+05	\N
3e63dcad-23c1-4e67-a348-e00f05ba0422	Dance Floor Panel	staging	8000.00	50	\N	\N	LED dance floor panel, 4x4 feet	t	2026-02-23 17:57:17.525934+05	2026-02-23 17:57:17.525934+05	\N
e9ab1bce-90ce-40dc-81ce-a4346888519e	Stage Skirting (per meter)	staging	1500.00	100	\N	\N	Fabric stage skirting per meter	t	2026-02-23 17:57:17.528793+05	2026-02-23 17:57:17.528793+05	\N
b8bc3c71-c079-4292-8c56-059df80358c1	Photo Backdrop (Floral)	backdrops	25000.00	12	\N	\N	Beautiful floral photo backdrop wall, 10x8 feet	t	2026-02-23 17:57:17.530949+05	2026-02-23 17:57:17.530949+05	\N
d27355db-9a3d-4d70-91ec-21dacff06634	Photo Backdrop (Sequin)	backdrops	18000.00	15	\N	\N	Sparkly sequin backdrop, 10x8 feet	t	2026-02-23 17:57:17.536706+05	2026-02-23 17:57:17.536706+05	\N
9f6278d0-2c0d-40d2-8ff0-b097369c7f66	Floral Arch	backdrops	40000.00	5	\N	\N	Grand floral arch for ceremonies, 8-foot tall	t	2026-02-23 17:57:17.543759+05	2026-02-23 17:57:17.543759+05	\N
2ef4338c-1068-46c5-afda-a0abd111a864	Pipe and Drape (White)	backdrops	15000.00	20	\N	\N	White pipe and drape backdrop section, 10x10 feet	t	2026-02-23 17:57:17.546193+05	2026-02-23 17:57:17.546193+05	\N
74c68bae-c983-42f9-b9b7-d7fcda6969a3	Neon Sign (Custom)	backdrops	20000.00	10	\N	\N	LED neon sign - custom text available	t	2026-02-23 17:57:17.54855+05	2026-02-23 17:57:17.54855+05	\N
e83b01da-2cdf-4564-8684-53adca204596	Royal red sofa	seating	500.00	999	dbdc46c9-3d83-410c-8301-2ab8c6599b6d.glb	/uploads/assets/6f8454ad-030e-4b36-be25-01c72ec612b6.png	\N	t	2026-04-20 17:02:13.69169+05	2026-04-20 17:02:13.69169+05	/models/dbdc46c9-3d83-410c-8301-2ab8c6599b6d.glb
7b9b2ee8-b73c-460c-9d81-28eb3c654225	Magnolia in a vase	decor	500.00	999	9e565dc9-edfb-470d-915a-af9e5c19d446.glb	/uploads/assets/3f6d9df9-0ed5-4787-9068-f242e2543abc.png	\N	t	2026-04-20 17:25:58.154758+05	2026-04-20 17:25:58.154758+05	/models/9e565dc9-edfb-470d-915a-af9e5c19d446.glb
d352abf7-02c0-4c91-b607-53175b689f17	chair type 2	seating	200.00	999	e047640d-6bea-4764-aa3b-85c9e8a9e398.glb	\N	\N	t	2026-05-04 14:14:18.798716+05	2026-05-04 14:14:18.798716+05	/models/e047640d-6bea-4764-aa3b-85c9e8a9e398.glb
606886b7-00a7-4e34-8fa6-7de29a87dac0	Round Table (8-seat)	tables	8000.00	50	TABLE.glb	\N	72-inch round table seating 8 guests comfortably	t	2026-02-23 17:57:17.444266+05	2026-04-20 00:33:49.755451+05	/models/TABLE.glb
ed9485d6-41cd-4395-b4f9-730acea3728b	Round Table (10-seat)	tables	10000.00	30	TABLE.glb	\N	84-inch round table seating 10 guests	t	2026-02-23 17:57:17.445909+05	2026-04-20 00:33:49.755451+05	/models/TABLE.glb
bd322245-e351-49e1-a612-d431315d075b	Rectangular Table (6-seat)	tables	6000.00	40	TABLE.glb	\N	6-foot rectangular banquet table	t	2026-02-23 17:57:17.44773+05	2026-04-20 00:33:49.755451+05	/models/TABLE.glb
7c8a84c5-d8df-4c29-85db-782b35ee3889	Rectangular Table (8-seat)	tables	7500.00	35	TABLE.glb	\N	8-foot rectangular banquet table	t	2026-02-23 17:57:17.456655+05	2026-04-20 00:33:49.755451+05	/models/TABLE.glb
341e1622-8643-42ef-9625-2e2181b1bcc2	Cocktail Table (High)	tables	3500.00	60	TABLE.glb	\N	High cocktail/poseur table for standing reception	t	2026-02-23 17:57:17.463412+05	2026-04-20 00:33:49.755451+05	/models/TABLE.glb
81c887af-6591-4924-9f19-2491069a7ce5	Cocktail Table (Low)	tables	3000.00	40	TABLE.glb	\N	Low cocktail table for lounge areas	t	2026-02-23 17:57:17.465391+05	2026-04-20 00:33:49.755451+05	/models/TABLE.glb
3f14bdb4-e4d7-4be6-97e5-b09a81a58336	Chiavari Chair (Gold)	seating	2500.00	200	chair2f.glb	\N	Elegant gold chiavari chair, perfect for weddings and formal events	t	2026-02-23 17:57:17.392857+05	2026-04-20 00:33:49.755451+05	/models/chair2f.glb
b8cfec60-794e-42e2-9254-aa7293292b9f	Chiavari Chair (Silver)	seating	2500.00	150	chair2f.glb	\N	Classic silver chiavari chair for sophisticated events	t	2026-02-23 17:57:17.422666+05	2026-04-20 00:33:49.755451+05	/models/chair2f.glb
35fde1d9-a674-432f-84e0-52483ffbc64e	Banquet Chair	seating	1500.00	300	chair2f.glb	\N	Comfortable padded banquet chair with fabric cover	t	2026-02-23 17:57:17.427232+05	2026-04-20 00:33:49.755451+05	/models/chair2f.glb
477372df-6ea2-466b-a7e3-22a84818e57f	Lounge Sofa (3-seater)	seating	15000.00	20	finalchair88.glb	\N	Luxurious 3-seater lounge sofa for VIP areas	t	2026-02-23 17:57:17.429137+05	2026-04-20 00:33:49.755451+05	/models/finalchair88.glb
9fd4ecc7-2a15-41d0-8681-4430bd1186ac	Lounge Chair	seating	8000.00	40	finalchair88.glb	\N	Single lounge chair matching the sofa collection	t	2026-02-23 17:57:17.431294+05	2026-04-20 00:33:49.755451+05	/models/finalchair88.glb
0aa74851-4f34-405d-8fc6-d6b321018227	Ottoman	seating	4000.00	30	finalchair88.glb	\N	Matching ottoman for lounge areas	t	2026-02-23 17:57:17.440643+05	2026-04-20 00:33:49.755451+05	/models/finalchair88.glb
0c74aa2d-2fea-4eac-86f6-0913c3a304cc	Crystal Chandelier (Large)	lighting	45000.00	10	\N	\N	Stunning large crystal chandelier, 4-foot diameter	t	2026-02-23 17:57:17.474122+05	2026-02-23 17:57:17.474122+05	\N
7f5fdff4-b919-4847-85e8-f801194209d6	Crystal Chandelier (Medium)	lighting	30000.00	15	\N	\N	Medium crystal chandelier, 3-foot diameter	t	2026-02-23 17:57:17.475841+05	2026-02-23 17:57:17.475841+05	\N
83176abd-e4ff-4ab0-8ac8-9aeb067fdcbe	Pendant Light Cluster	lighting	12000.00	30	\N	\N	Modern pendant light cluster with 5 globes	t	2026-02-23 17:57:17.477942+05	2026-02-23 17:57:17.477942+05	\N
16543e03-9db3-437a-b686-450ba4c2b56f	Fairy Light Curtain	lighting	5000.00	50	\N	\N	LED fairy light curtain, 10x10 feet	t	2026-02-23 17:57:17.480029+05	2026-02-23 17:57:17.480029+05	\N
f43d0fca-3341-41e4-a23f-a7ffc7a20fd8	Uplighter (LED)	lighting	3000.00	80	\N	\N	RGB LED uplighter for ambient wall lighting	t	2026-02-23 17:57:17.481963+05	2026-02-23 17:57:17.481963+05	\N
0ca2e62b-5148-4c09-b97d-f50649c2364c	Floral Centerpiece (Premium)	decor	8000.00	60	\N	\N	Premium floral centerpiece with roses and orchids	t	2026-02-23 17:57:17.491571+05	2026-02-23 17:57:17.491571+05	\N
ad47cb02-cfd2-4182-a1b2-4aa5d32c3b5a	Floral Centerpiece (Standard)	decor	5000.00	100	\N	\N	Standard mixed flower centerpiece	t	2026-02-23 17:57:17.493973+05	2026-02-23 17:57:17.493973+05	\N
d03a9350-4269-4f2d-a4c5-c626db150203	Glass Vase Arrangement	decor	3500.00	80	\N	\N	Tall glass vase with floral arrangement	t	2026-02-23 17:57:17.49703+05	2026-02-23 17:57:17.49703+05	\N
214e3263-c5bb-4622-813c-94043dad9ad3	Candelabra (5-arm)	decor	6000.00	40	\N	\N	Elegant 5-arm candelabra with LED candles	t	2026-02-23 17:57:17.499797+05	2026-02-23 17:57:17.499797+05	\N
\.


--
-- Data for Name: budget_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.budget_items (id, event_id, asset_id, quantity, unit_price_override, created_at, updated_at) FROM stdin;
83c1f93c-aa66-45f8-9dbc-2862e8c8bed9	307b097f-2c94-4641-8493-3fcbc8b3dc53	d352abf7-02c0-4c91-b607-53175b689f17	1	\N	2026-05-11 02:04:51.500505+05	2026-05-11 02:04:51.500505+05
3e6be1a6-b68e-455d-92f5-e2d73e67b03b	c6d25422-8ca7-488e-bd98-76cd2153b830	35fde1d9-a674-432f-84e0-52483ffbc64e	1	\N	2026-02-24 13:09:26.987871+05	2026-02-24 13:09:26.987871+05
9e500762-280b-4b5a-a2e6-bff2711e7890	6998fe76-996c-4532-8b19-ed306eba0c29	35fde1d9-a674-432f-84e0-52483ffbc64e	1	\N	2026-02-24 13:36:29.816293+05	2026-02-24 13:36:29.816293+05
\.


--
-- Data for Name: checklist_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.checklist_items (id, event_id, title, description, due_date, is_complete, is_system_generated, completed_at, created_at, updated_at) FROM stdin;
656cec9b-9bed-4e45-b134-0b2fcf6e1c16	6998fe76-996c-4532-8b19-ed306eba0c29	Confirm venue booking	Ensure venue is confirmed and deposit paid	2026-02-23	f	t	\N	2026-02-24 13:38:04.645298+05	2026-02-24 13:38:04.645298+05
0670578c-8cfe-415c-a80e-c7089a4c3ee4	6998fe76-996c-4532-8b19-ed306eba0c29	Confirm final headcount	Get final guest count from client	2026-03-15	f	t	\N	2026-02-24 13:38:04.654363+05	2026-02-24 13:38:04.654363+05
27c3b6fb-d068-4de4-8b52-ef9b099eae23	6998fe76-996c-4532-8b19-ed306eba0c29	Review final layout with client	Walk through 3D design and get final approval	2026-03-18	f	t	\N	2026-02-24 13:38:04.656026+05	2026-02-24 13:38:04.656026+05
f3829628-d962-41e2-951c-bd34f43111fa	6998fe76-996c-4532-8b19-ed306eba0c29	Confirm delivery schedule	Verify all vendor delivery times and setup schedules	2026-03-22	f	t	\N	2026-02-24 13:38:04.657919+05	2026-02-24 13:38:04.657919+05
f8274cd5-c083-47a7-95c3-f908e24db469	6998fe76-996c-4532-8b19-ed306eba0c29	Confirm day-of timeline	Final review of event timeline with all parties	2026-03-24	f	t	\N	2026-02-24 13:38:04.659691+05	2026-02-24 13:38:04.659691+05
405baaca-6c12-42ac-be66-587b57d4e153	6998fe76-996c-4532-8b19-ed306eba0c29	Finalize vendor payments	Ensure all deposits are paid and final payments scheduled	2026-03-11	t	t	2026-02-24 13:38:10.454244+05	2026-02-24 13:38:04.652485+05	2026-02-24 13:38:10.454244+05
422717ea-6f47-4a36-95ac-02e4fa09951e	6998fe76-996c-4532-8b19-ed306eba0c29	Finalize vendor contracts	All vendor agreements should be signed	2026-03-04	t	t	2026-02-24 13:38:12.036863+05	2026-02-24 13:38:04.649177+05	2026-02-24 13:38:12.036863+05
8d96560f-6ab9-477a-a623-8ce2903ebf6d	c6d25422-8ca7-488e-bd98-76cd2153b830	Finalize vendor contracts	All vendor agreements should be signed	2026-03-04	f	t	\N	2026-02-25 20:07:48.004268+05	2026-02-25 20:07:48.004268+05
39f09b0f-c342-4f62-bf55-5016e4fe184c	c6d25422-8ca7-488e-bd98-76cd2153b830	Finalize vendor payments	Ensure all deposits are paid and final payments scheduled	2026-03-11	f	t	\N	2026-02-25 20:07:48.02397+05	2026-02-25 20:07:48.02397+05
b1e696d3-5cc9-4ad2-8232-4461c573cb3e	c6d25422-8ca7-488e-bd98-76cd2153b830	Confirm final headcount	Get final guest count from client	2026-03-15	f	t	\N	2026-02-25 20:07:48.028444+05	2026-02-25 20:07:48.028444+05
ec828a8a-03fe-426e-88a3-ff0fd7686940	c6d25422-8ca7-488e-bd98-76cd2153b830	Review final layout with client	Walk through 3D design and get final approval	2026-03-18	f	t	\N	2026-02-25 20:07:48.033795+05	2026-02-25 20:07:48.033795+05
eed45c97-4a66-4c74-b7d5-8d245122228c	c6d25422-8ca7-488e-bd98-76cd2153b830	Confirm delivery schedule	Verify all vendor delivery times and setup schedules	2026-03-22	f	t	\N	2026-02-25 20:07:48.036936+05	2026-02-25 20:07:48.036936+05
cdad627c-dd8d-4f74-afd2-2d4e5eece8b4	c6d25422-8ca7-488e-bd98-76cd2153b830	Confirm day-of timeline	Final review of event timeline with all parties	2026-03-24	f	t	\N	2026-02-25 20:07:48.040422+05	2026-02-25 20:07:48.040422+05
\.


--
-- Data for Name: client_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.client_comments (id, event_id, parent_comment_id, client_identifier, content, is_planner_reply, created_at) FROM stdin;
548fd1dc-cfcd-4d9e-ada0-483f414dd45b	c6d25422-8ca7-488e-bd98-76cd2153b830	\N	maha	chnage flowers	f	2026-02-24 13:09:53.770209+05
d3e4ffc7-81af-4bb0-bd50-2e4fd50e0edc	6998fe76-996c-4532-8b19-ed306eba0c29	\N	maha	change flowers to yellow	f	2026-02-24 13:37:36.671683+05
\.


--
-- Data for Name: client_requirements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.client_requirements (id, event_id, share_token, client_name, client_email, event_type, event_date, guest_count, venue_type, hall_preference, seating_style, seating_notes, meal_preference, lighting_preference, decoration_preference, addons, budget_range, special_requests, is_submitted, submitted_at, created_at) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.events (id, planner_id, venue_template_id, name, event_type, event_date, status, share_token, share_password_hash, budget_ceiling, show_budget_details, notes, created_at, updated_at) FROM stdin;
49391695-98df-43ce-925f-6bbcd746bc30	760222f2-f1e1-4f11-a8ac-742ef87b229a	\N	sarah and ahmad	wedding	2026-03-24	draft	48f29aea-9d51-4ef0-a933-8d662ebf0718	\N	3000000.00	t	\N	2026-02-22 20:14:36.835147+05	2026-02-22 20:14:36.835147+05
307b097f-2c94-4641-8493-3fcbc8b3dc53	95b28edb-bfc9-4114-bb6a-27a58dba32ff	4a0139f5-1ddf-4667-9f9d-9dc29a6232e6	Maha Fareed — Graduation Party	graduation party	2026-05-19	draft	36a6774e-d160-4f00-a267-926dc6a62e2e	\N	30000.00	t	none\n\nGuest count (from inquiry): 30\n\nVenue preference: Garden / Outdoor (Own)	2026-05-10 23:30:27.13638+05	2026-05-10 23:42:57.85357+05
c6d25422-8ca7-488e-bd98-76cd2153b830	00000000-0000-0000-0000-000000000002	\N	sarah	wedding	2026-03-26	draft	92dca3f3-16d4-43bd-9563-d8b51b564dab	\N	300000.00	t	\N	2026-02-24 13:07:55.891722+05	2026-02-24 13:07:55.891722+05
6998fe76-996c-4532-8b19-ed306eba0c29	00000000-0000-0000-0000-000000000002	\N	maha	wedding	2026-03-26	draft	dc2d39a6-501b-473f-8e45-15f0a59357af	\N	500000.00	t	\N	2026-02-24 13:31:19.057002+05	2026-02-24 13:31:19.057002+05
\.


--
-- Data for Name: inquiries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inquiries (id, planner_id, share_token, client_name, client_email, event_type, event_date, guest_count, venue_type, hall_preference, seating_style, seating_notes, meal_preference, addons, budget_range, lighting_preference, decoration_preference, special_requests, inspiration_images, is_submitted, submitted_at, created_at, shortlisted_venue_ids, selected_venue_id, venue_selection_token, venue_selected_at, venue_hold_expires_at, converted_event_id, converted_at) FROM stdin;
54319d28-963f-45ac-b0d2-b259c6cd4d62	95b28edb-bfc9-4114-bb6a-27a58dba32ff	3eb18433-5ee7-4742-9680-dc22360c248c	Alaina Shahid	alaina121@gmail.com	housewarming party	2026-07-02	15	Home	\N	Banquet	2 round tables, 1 sofa sets, 1 stage	Daig / Deg Style — Chicken	{"Special lighting","Sound system","Custom decorations"}	Rs. 25,000	Fairy Lights	\N	need a backdrop for pictures.	\N	t	2026-05-11 00:16:26.159837	2026-05-11 00:13:24.995303	{}	\N	\N	\N	\N	\N	\N
5abd1e76-a2f5-45ab-9258-3c979bbb4d0c	95b28edb-bfc9-4114-bb6a-27a58dba32ff	31c27667-6fa1-4c4a-a348-122dab259940	Maha Fareed	Maha123@gmail.com	Graduation Party	2026-05-20	30	Garden / Outdoor (Own)	\N	Banquet	3 round tables, 1 sofa sets, 1 stage	Standard Buffet — Chicken	{"Custom decorations","Sound system"}	Rs. 30,000	Fairy Lights	\N	none	\N	t	2026-05-10 20:42:44.339461	2026-05-10 20:34:50.646172	{6c72b5a0-5920-475a-931c-8936b63082f6,4a0139f5-1ddf-4667-9f9d-9dc29a6232e6,9722fa3f-db4f-4b04-b925-892be9f90576}	4a0139f5-1ddf-4667-9f9d-9dc29a6232e6	c4b88e259416ef3d01d68dd6308091584bc3a5f5397c826fc9bd1f54deea1fe5	2026-05-10 23:42:57.833583+05	2026-05-11 23:42:57.831+05	307b097f-2c94-4641-8493-3fcbc8b3dc53	2026-05-10 23:30:27.223384+05
\.


--
-- Data for Name: milestones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.milestones (id, event_id, title, target_date, is_complete, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: scene_layouts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scene_layouts (id, event_id, scene_json, version, locked, created_at, updated_at) FROM stdin;
c96f2c87-e6d5-4cf7-9311-8b666dfff2ea	307b097f-2c94-4641-8493-3fcbc8b3dc53	{"venue": {"floorSize": {"depth": 30, "width": 20}, "templateId": "", "wallHeight": 4}, "savedAt": "2026-05-10T21:04:51.985Z", "version": 1, "lighting": {"ambientIntensity": 0.6, "directionalPosition": {"x": 5, "y": 10, "z": 5}, "directionalIntensity": 0.8}, "placedAssets": [{"id": "f2957acb-1051-412a-b499-c5b81f1e5919", "name": "chair type 2", "assetId": "d352abf7-02c0-4c91-b607-53175b689f17", "category": "seating", "transform": {"scale": {"x": 0.1, "y": 0.1, "z": 0.1}, "position": {"x": -0.7827366259309378, "y": 0.1, "z": -0.5014278520625933}, "rotation": {"x": 0, "y": 0, "z": 0}}, "unitPrice": 200}]}	1	f	2026-05-11 02:04:51.489484+05	2026-05-11 02:04:51.489484+05
e4b9332f-74f3-4f41-850c-c7b1bb74caad	49391695-98df-43ce-925f-6bbcd746bc30	{"venue": {"floorSize": {"depth": 15, "width": 20}, "templateId": "", "wallHeight": 4}, "savedAt": "2026-02-23T08:13:03.382Z", "version": 1, "lighting": {"ambientIntensity": 0.6, "directionalPosition": {"x": 5, "y": 10, "z": 5}, "directionalIntensity": 0.8}, "placedAssets": [{"id": "2eb2742e-d7fe-4f12-a83e-3be2c9e97bfd", "name": "Banquet Chair", "assetId": "1d8baec7-169f-4f85-a3c2-4f4d7472b46d", "category": "seating", "transform": {"scale": {"x": 1, "y": 1, "z": 1}, "position": {"x": -0.8518836855156642, "y": 0, "z": -0.33564044549080085}, "rotation": {"x": 0, "y": 0, "z": 0}}, "unitPrice": 1500}, {"id": "423d513e-1668-4fab-9c1a-1fd64910be4c", "name": "Chiavari Chair (Gold)", "assetId": "bd3d3b8b-239a-4ebd-bc63-e5edbf23d827", "category": "seating", "transform": {"scale": {"x": 1, "y": 1, "z": 1}, "position": {"x": -0.8503286441027584, "y": 0, "z": -0.337194925810961}, "rotation": {"x": 0, "y": 0, "z": 0}}, "unitPrice": 2500}, {"id": "e25a76b4-e0a0-4801-a991-32da75ae8343", "name": "Chiavari Chair (Gold)", "assetId": "bd3d3b8b-239a-4ebd-bc63-e5edbf23d827", "category": "seating", "transform": {"scale": {"x": 1, "y": 1, "z": 1}, "position": {"x": 1.0638802705519423, "y": 0, "z": 0.1581970323270001}, "rotation": {"x": 0, "y": 0, "z": 0}}, "unitPrice": 2500}, {"id": "90273b9a-41b2-4ec5-a8df-9cb0965a7d88", "name": "Lounge Chair", "assetId": "33b08469-5964-42a7-8bde-4597b3da2120", "category": "seating", "transform": {"scale": {"x": 1, "y": 1, "z": 1}, "position": {"x": 1.3688835122128196, "y": 0, "z": 1.2525413320108656}, "rotation": {"x": 0, "y": 0, "z": 0}}, "unitPrice": 8000}, {"id": "7e197b0f-e09f-4cf0-826b-2a2dc6cff72a", "name": "Lounge Sofa (3-seater)", "assetId": "a5fecef3-a715-43f6-b6a7-efdca1e3549c", "category": "seating", "transform": {"scale": {"x": 1, "y": 1, "z": 1}, "position": {"x": 0.9949451974848267, "y": 0, "z": 2.370855226496953}, "rotation": {"x": 0, "y": 0, "z": 0}}, "unitPrice": 15000}, {"id": "3e038e9a-49f9-405d-90bc-534ea7bb320f", "name": "Cocktail Table (High)", "assetId": "5020854b-d7b5-4d98-b6b1-4b5a21f83f1a", "category": "tables", "transform": {"scale": {"x": 1, "y": 1, "z": 1}, "position": {"x": -0.9182863268071606, "y": 0, "z": -2.9496645553650414}, "rotation": {"x": 0, "y": 0, "z": 0}}, "unitPrice": 3500}]}	3	f	2026-02-23 13:04:16.204145+05	2026-02-23 13:13:03.759073+05
df985d7d-cb04-447d-bc2e-090dabdd382d	c6d25422-8ca7-488e-bd98-76cd2153b830	{"venue": {"floorSize": {"depth": 15, "width": 20}, "templateId": "", "wallHeight": 4}, "savedAt": "2026-02-24T08:09:26.959Z", "version": 1, "lighting": {"ambientIntensity": 0.6, "directionalPosition": {"x": 5, "y": 10, "z": 5}, "directionalIntensity": 0.8}, "placedAssets": [{"id": "b2177bd4-a33e-40bf-b2be-f54997d5bac3", "name": "Banquet Chair", "assetId": "35fde1d9-a674-432f-84e0-52483ffbc64e", "category": "seating", "transform": {"scale": {"x": 1, "y": 1, "z": 1}, "position": {"x": -9.313395566516691, "y": 0, "z": 6.11756449862586}, "rotation": {"x": 0, "y": 0, "z": 0}}, "unitPrice": 1500}]}	3	f	2026-02-24 13:09:15.744071+05	2026-02-24 13:09:26.98427+05
cc948453-c8bf-468f-99b0-bd0f8e453fce	6998fe76-996c-4532-8b19-ed306eba0c29	{"venue": {"floorSize": {"depth": 15, "width": 20}, "templateId": "", "wallHeight": 4}, "savedAt": "2026-02-24T08:36:29.772Z", "version": 1, "lighting": {"ambientIntensity": 0.6, "directionalPosition": {"x": 5, "y": 10, "z": 5}, "directionalIntensity": 0.8}, "placedAssets": [{"id": "2e39d4d3-2db4-489a-b6be-dbd865539250", "name": "Banquet Chair", "assetId": "35fde1d9-a674-432f-84e0-52483ffbc64e", "category": "seating", "transform": {"scale": {"x": 1, "y": 1, "z": 1}, "position": {"x": -6.503627407013102, "y": 0, "z": -1.6367915192536682}, "rotation": {"x": 0, "y": 0, "z": 0}}, "unitPrice": 1500}]}	2	f	2026-02-24 13:36:26.236684+05	2026-02-24 13:36:29.801095+05
\.


--
-- Data for Name: stock_reservations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_reservations (id, event_id, asset_id, quantity_reserved, created_at, updated_at) FROM stdin;
8e4bb47e-ea83-4e60-8dce-9128c699cb8a	c6d25422-8ca7-488e-bd98-76cd2153b830	35fde1d9-a674-432f-84e0-52483ffbc64e	1	2026-02-24 13:09:15.782338+05	2026-02-24 13:09:27.008915+05
3eded112-cf17-4cb9-a476-2f61c1dd5dfa	6998fe76-996c-4532-8b19-ed306eba0c29	35fde1d9-a674-432f-84e0-52483ffbc64e	1	2026-02-24 13:36:26.267683+05	2026-02-24 13:36:29.832138+05
f46b2aea-d3b9-488e-88a6-22b67c15ea9a	307b097f-2c94-4641-8493-3fcbc8b3dc53	d352abf7-02c0-4c91-b607-53175b689f17	1	2026-05-11 02:04:51.550871+05	2026-05-11 02:04:51.550871+05
\.


--
-- Data for Name: timeline_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.timeline_entries (id, event_id, time_slot, title, description, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password_hash, role, is_active, created_at, updated_at) FROM stdin;
760222f2-f1e1-4f11-a8ac-742ef87b229a	Test Planner	test@dreamstage.com	$2b$12$pzVZcXKCx/syUmKpwOWh2u8X8ppKfH.Oq6Jhg2ty0Tms3KErzIFEG	planner	t	2026-02-22 19:32:50.649477+05	2026-02-22 19:32:50.649477+05
00000000-0000-0000-0000-000000000002	Sarah Planner	planner@dreamstage.com	$2b$12$w/UyKmRaLk1FzY1ubc4aKOige.O9Y8e.Uf16n7yeV5XKd.23yvYzy	planner	t	2026-02-22 19:48:05.696339+05	2026-02-22 19:48:05.696339+05
95b28edb-bfc9-4114-bb6a-27a58dba32ff	nimra	nimrahussain156@gmail.com	$2b$12$h35t6NdGI2rY8g/Z0Ixlie6ZIvwfVo6UIv2MDC.QTuNY94LG4BmG6	planner	t	2026-02-23 21:59:13.80228+05	2026-02-23 21:59:13.80228+05
00000000-0000-0000-0000-000000000001	Admin User	admin@dreamstage.com	$2a$06$nqiM5/vsqQOjMWUCkGWd3uc2SVZEZVZG1W.K1Ax/eKS1PXpJ35qIq	admin	t	2026-02-22 15:43:44.477506+05	2026-04-18 19:36:23.793933+05
6672d766-963f-4cdb-8c61-98f08c4252fd	Nimra	nimrahsx2@gmail.com	$2b$12$s0QNQ80w86H4HpxV.ZENnenWIZDU8dOG5QdTVZn1cX4PosAvs.UPm	admin	t	2026-05-11 00:02:13.656322+05	2026-05-11 00:02:13.656322+05
75aaa434-512f-472f-8f36-0ccc834d707e	Maha Fareed	mahafareed188@gmail.com	$2b$12$s0QNQ80w86H4HpxV.ZENnenWIZDU8dOG5QdTVZn1cX4PosAvs.UPm	admin	t	2026-04-27 18:05:33.675739+05	2026-05-11 00:02:13.656322+05
8701b03c-ddd3-4b10-8394-384317d0efd9	Amna	amnamzhr67@gmail.com	$2b$12$s0QNQ80w86H4HpxV.ZENnenWIZDU8dOG5QdTVZn1cX4PosAvs.UPm	admin	t	2026-05-11 00:02:13.656322+05	2026-05-11 00:02:13.656322+05
\.


--
-- Data for Name: vendor_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vendor_payments (id, vendor_id, amount, payment_type, paid_at, notes, created_at) FROM stdin;
2388b41c-05de-4e1e-b39f-eb33a3326165	fbb5e479-7f70-4b9d-bea1-68afef607927	5000.00	final	2026-02-24	\N	2026-02-24 13:35:42.033375+05
12dec605-4c8a-476a-a9f0-ae3b3ebf0bc1	fd0bc4be-0342-4b36-a5e1-85bea29d65d1	5000.00	final	2026-02-25	\N	2026-02-25 20:07:42.234688+05
\.


--
-- Data for Name: vendor_quotes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vendor_quotes (id, vendor_id, file_name, file_url, file_size, uploaded_at) FROM stdin;
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vendors (id, event_id, name, company, email, phone, category, quote_url, notes, created_at, updated_at, total_contract_amount) FROM stdin;
fbb5e479-7f70-4b9d-bea1-68afef607927	6998fe76-996c-4532-8b19-ed306eba0c29	amna	flowers	\N	033456728	florist	\N	\N	2026-02-24 13:35:04.426066+05	2026-02-24 13:35:04.426066+05	0.00
fd0bc4be-0342-4b36-a5e1-85bea29d65d1	c6d25422-8ca7-488e-bd98-76cd2153b830	amna	flowers	\N	033321345	florist	\N	\N	2026-02-25 20:07:34.917917+05	2026-02-25 20:07:34.917917+05	0.00
\.


--
-- Data for Name: venue_bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.venue_bookings (id, event_id, venue_template_id, booking_date, status, created_at, updated_at) FROM stdin;
6cbae735-e73b-47ce-85d4-ecbf2704f39a	307b097f-2c94-4641-8493-3fcbc8b3dc53	4a0139f5-1ddf-4667-9f9d-9dc29a6232e6	2026-05-20	confirmed	2026-05-10 23:42:57.839113+05	2026-05-10 23:42:57.839113+05
\.


--
-- Data for Name: venue_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.venue_templates (id, name, category, capacity, thumbnail_url, model_ref, description, is_active, created_at, updated_at, price_per_head, location, gallery_images, video_url) FROM stdin;
dacec8cb-af8c-43bc-a14f-9ef605b486b3	Grand Ballroom	Banquet Hall	500	\N	\N	Luxurious ballroom with crystal chandeliers, marble floors, and elegant drapery. Perfect for large weddings and corporate galas.	t	2026-02-22 21:45:28.434503+05	2026-02-22 21:45:28.434503+05	\N	\N	[]	\N
8f9158f1-a2d3-435a-83c2-3e1ae5f9b95d	Pearl Hall	Banquet Hall	300	\N	\N	Sophisticated hall featuring modern design with classic touches. Ideal for medium-sized celebrations.	t	2026-02-22 21:45:28.446892+05	2026-02-22 21:45:28.446892+05	\N	\N	[]	\N
d26e39db-56cf-44d7-9882-044036ff0ff7	Ruby Room	Banquet Hall	150	\N	\N	Intimate banquet space with warm lighting and rich décor. Perfect for smaller gatherings and corporate dinners.	t	2026-02-22 21:45:28.450843+05	2026-02-22 21:45:28.450843+05	\N	\N	[]	\N
9722fa3f-db4f-4b04-b925-892be9f90576	Garden Terrace	Outdoor	200	\N	\N	Beautiful open-air garden venue with manicured lawns, fountain centerpiece, and twinkling fairy lights.	t	2026-02-22 21:45:28.456499+05	2026-02-22 21:45:28.456499+05	\N	\N	[]	\N
4a0139f5-1ddf-4667-9f9d-9dc29a6232e6	Lakeside Pavilion	Outdoor	250	\N	\N	Stunning waterfront venue with covered pavilion, dock access, and panoramic lake views.	t	2026-02-22 21:45:28.461367+05	2026-02-22 21:45:28.461367+05	\N	\N	[]	\N
6c72b5a0-5920-475a-931c-8936b63082f6	Rooftop Sky Lounge	Outdoor	120	\N	\N	Modern rooftop venue with city skyline views, retractable awning, and ambient lighting.	t	2026-02-22 21:45:28.46392+05	2026-02-22 21:45:28.46392+05	\N	\N	[]	\N
e8c89f73-22c4-4b46-814a-5a70079adfa0	Executive Conference Center	Conference	100	\N	\N	State-of-the-art conference facility with AV equipment, breakout rooms, and catering support.	t	2026-02-22 21:45:28.46793+05	2026-02-22 21:45:28.46793+05	\N	\N	[]	\N
7636a8b9-5f5e-44aa-aaaa-e626eee5b5fa	Innovation Hub	Conference	80	\N	\N	Modern tech-enabled space with flexible seating, video conferencing, and collaborative zones.	t	2026-02-22 21:45:28.475462+05	2026-02-22 21:45:28.475462+05	\N	\N	[]	\N
4c96ee65-2687-4a86-b261-bc16f9adc31a	Jasmine Suite	Intimate	50	\N	\N	Elegant private suite with fireplace, lounge seating, and personalized service. Perfect for engagement parties.	t	2026-02-22 21:45:28.478799+05	2026-02-22 21:45:28.478799+05	\N	\N	[]	\N
0c9fb5dd-9cf4-4057-9b4e-d6898c51770b	The Conservatory	Intimate	40	\N	\N	Glass-enclosed garden room filled with natural light and greenery. Ideal for brunches and small receptions.	t	2026-02-22 21:45:28.481553+05	2026-02-22 21:45:28.481553+05	\N	\N	[]	\N
c1a70524-0e52-42b6-b56a-b9bcd1a5c70a	Mughal Palace	Heritage	400	\N	\N	Historic venue featuring traditional Mughal architecture, intricate tile work, and courtyard gardens.	t	2026-02-22 21:45:28.484649+05	2026-02-22 21:45:28.484649+05	\N	\N	[]	\N
9aff748c-cef7-4e65-8217-09343128a4ea	Mughal e Azam Grand	Banquet Hall	1500	/uploads/venues/e510faf6-f68d-47e5-8355-47b49e75b6cc.png	\N	Mughal-e-Azam Grand · Step into a realm where history meets high-end luxury. · Defining elegance in the heart of Lahore.	t	2026-02-22 21:45:28.49095+05	2026-04-19 22:50:08.682111+05	4800.00	Location: Raiwind Road, Adda Plot, Lahore.	["/uploads/venues/e510faf6-f68d-47e5-8355-47b49e75b6cc.png"]	https://youtu.be/pZlH5EeH1bE?si=EaDfFc4BEZMd_qbE
\.


--
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: budget_items budget_items_event_id_asset_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_event_id_asset_id_key UNIQUE (event_id, asset_id);


--
-- Name: budget_items budget_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_pkey PRIMARY KEY (id);


--
-- Name: checklist_items checklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklist_items
    ADD CONSTRAINT checklist_items_pkey PRIMARY KEY (id);


--
-- Name: client_comments client_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_comments
    ADD CONSTRAINT client_comments_pkey PRIMARY KEY (id);


--
-- Name: client_requirements client_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_requirements
    ADD CONSTRAINT client_requirements_pkey PRIMARY KEY (id);


--
-- Name: client_requirements client_requirements_share_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_requirements
    ADD CONSTRAINT client_requirements_share_token_key UNIQUE (share_token);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: events events_share_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_share_token_key UNIQUE (share_token);


--
-- Name: inquiries inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_pkey PRIMARY KEY (id);


--
-- Name: inquiries inquiries_share_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_share_token_key UNIQUE (share_token);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- Name: scene_layouts scene_layouts_event_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scene_layouts
    ADD CONSTRAINT scene_layouts_event_id_key UNIQUE (event_id);


--
-- Name: scene_layouts scene_layouts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scene_layouts
    ADD CONSTRAINT scene_layouts_pkey PRIMARY KEY (id);


--
-- Name: stock_reservations stock_reservations_event_id_asset_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_event_id_asset_id_key UNIQUE (event_id, asset_id);


--
-- Name: stock_reservations stock_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_pkey PRIMARY KEY (id);


--
-- Name: timeline_entries timeline_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timeline_entries
    ADD CONSTRAINT timeline_entries_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vendor_payments vendor_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_pkey PRIMARY KEY (id);


--
-- Name: vendor_quotes vendor_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_quotes
    ADD CONSTRAINT vendor_quotes_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: venue_bookings venue_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_pkey PRIMARY KEY (id);


--
-- Name: venue_bookings venue_bookings_venue_template_id_booking_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_venue_template_id_booking_date_key UNIQUE (venue_template_id, booking_date);


--
-- Name: venue_templates venue_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venue_templates
    ADD CONSTRAINT venue_templates_pkey PRIMARY KEY (id);


--
-- Name: idx_budget_items_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budget_items_event ON public.budget_items USING btree (event_id);


--
-- Name: idx_checklist_items_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checklist_items_event ON public.checklist_items USING btree (event_id);


--
-- Name: idx_client_comments_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_comments_event ON public.client_comments USING btree (event_id);


--
-- Name: idx_client_comments_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_comments_parent ON public.client_comments USING btree (parent_comment_id);


--
-- Name: idx_client_requirements_event_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_requirements_event_id ON public.client_requirements USING btree (event_id);


--
-- Name: idx_client_requirements_share_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_requirements_share_token ON public.client_requirements USING btree (share_token);


--
-- Name: idx_events_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_date ON public.events USING btree (event_date);


--
-- Name: idx_events_planner_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_planner_id ON public.events USING btree (planner_id);


--
-- Name: idx_events_share_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_share_token ON public.events USING btree (share_token);


--
-- Name: idx_events_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_status ON public.events USING btree (status);


--
-- Name: idx_inquiries_planner_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inquiries_planner_id ON public.inquiries USING btree (planner_id);


--
-- Name: idx_inquiries_share_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inquiries_share_token ON public.inquiries USING btree (share_token);


--
-- Name: idx_milestones_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_milestones_event ON public.milestones USING btree (event_id);


--
-- Name: idx_scene_layouts_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scene_layouts_event ON public.scene_layouts USING btree (event_id);


--
-- Name: idx_stock_reservations_asset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_reservations_asset ON public.stock_reservations USING btree (asset_id);


--
-- Name: idx_stock_reservations_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_reservations_event ON public.stock_reservations USING btree (event_id);


--
-- Name: idx_timeline_entries_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_timeline_entries_event ON public.timeline_entries USING btree (event_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role) WHERE (is_active = true);


--
-- Name: idx_vendor_payments_vendor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendor_payments_vendor ON public.vendor_payments USING btree (vendor_id);


--
-- Name: idx_vendor_quotes_vendor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendor_quotes_vendor ON public.vendor_quotes USING btree (vendor_id);


--
-- Name: idx_vendors_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vendors_event ON public.vendors USING btree (event_id);


--
-- Name: idx_venue_bookings_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_venue_bookings_event ON public.venue_bookings USING btree (event_id);


--
-- Name: idx_venue_bookings_venue_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_venue_bookings_venue_date ON public.venue_bookings USING btree (venue_template_id, booking_date);


--
-- Name: assets update_assets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: budget_items update_budget_items_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_budget_items_updated_at BEFORE UPDATE ON public.budget_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: checklist_items update_checklist_items_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON public.checklist_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events update_events_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: milestones update_milestones_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scene_layouts update_scene_layouts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_scene_layouts_updated_at BEFORE UPDATE ON public.scene_layouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stock_reservations update_stock_reservations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_stock_reservations_updated_at BEFORE UPDATE ON public.stock_reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: timeline_entries update_timeline_entries_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_timeline_entries_updated_at BEFORE UPDATE ON public.timeline_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vendors update_vendors_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: venue_bookings update_venue_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_venue_bookings_updated_at BEFORE UPDATE ON public.venue_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: venue_templates update_venue_templates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_venue_templates_updated_at BEFORE UPDATE ON public.venue_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: approvals approvals_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: budget_items budget_items_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: budget_items budget_items_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: checklist_items checklist_items_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklist_items
    ADD CONSTRAINT checklist_items_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: client_comments client_comments_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_comments
    ADD CONSTRAINT client_comments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: client_comments client_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_comments
    ADD CONSTRAINT client_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.client_comments(id) ON DELETE CASCADE;


--
-- Name: client_requirements client_requirements_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_requirements
    ADD CONSTRAINT client_requirements_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: events events_planner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_planner_id_fkey FOREIGN KEY (planner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: events events_venue_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_venue_template_id_fkey FOREIGN KEY (venue_template_id) REFERENCES public.venue_templates(id) ON DELETE SET NULL;


--
-- Name: inquiries inquiries_converted_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_converted_event_id_fkey FOREIGN KEY (converted_event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: inquiries inquiries_planner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_planner_id_fkey FOREIGN KEY (planner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: inquiries inquiries_selected_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_selected_venue_id_fkey FOREIGN KEY (selected_venue_id) REFERENCES public.venue_templates(id);


--
-- Name: milestones milestones_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: scene_layouts scene_layouts_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scene_layouts
    ADD CONSTRAINT scene_layouts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: stock_reservations stock_reservations_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: stock_reservations stock_reservations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: timeline_entries timeline_entries_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timeline_entries
    ADD CONSTRAINT timeline_entries_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: vendor_payments vendor_payments_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendor_quotes vendor_quotes_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendor_quotes
    ADD CONSTRAINT vendor_quotes_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: venue_bookings venue_bookings_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: venue_bookings venue_bookings_venue_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_venue_template_id_fkey FOREIGN KEY (venue_template_id) REFERENCES public.venue_templates(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 8Yo9v7ZkringVtFqwoM7chXyIwGVWIWKHxJ7t42dMPeMEbvDazGHJNn1TsNJj4h

