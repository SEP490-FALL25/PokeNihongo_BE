// import { Injectable, Logger } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { GoogleGenerativeAI } from '@google/generative-ai';
// import { IGeminiResponse, ImageAnalysisResponse, TextAnalysisResponse } from './dto/gemini.response.dto';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';

// import * as crypto from 'crypto';
// // Import a Type-Only Location to avoid conflicts

// @Injectable()
// export class GeminiService {
//     private readonly logger = new Logger(GeminiService.name);
//     private readonly genAI: GoogleGenerativeAI;
//     private readonly modelName: string;
//     private readonly generationConfig: any;
//     private readonly safetySettings: any;
//     // Tối ưu: Simple in-memory cache cho quick access
//     private readonly cache = new Map<string, { data: any; expiry: number }>();
//     private readonly CACHE_TTL = 3600000; // 1 hour

//     // Tối ưu: Performance configs
//     private readonly MAX_CONCURRENT_REQUESTS = 3;
//     private readonly EMBEDDING_BATCH_SIZE = 10;
//     private readonly RELEVANCE_THRESHOLD = 0.1;

//     // Tối ưu: Image processing configs
//     private readonly MAX_IMAGE_SIZE = 1024; // Max width/height in pixels
//     private readonly IMAGE_QUALITY = 85; // JPEG quality for compression

//     // Pricing calculation constants (same as ServicePackageService)
//     private readonly COMMISSION_RATE = 0.30; // 30%
//     private readonly TAX_RATE = 0.05; // 5%
//     private readonly TOTAL_MULTIPLIER = 1 + this.COMMISSION_RATE + this.TAX_RATE; // 1.35

//     // Tối ưu: Request queue management
//     private activeRequests = 0;
//     private requestQueue: Array<() => Promise<any>> = [];

//     // Tối ưu: Model caching
//     private embeddingModel: any = null;

//     private readonly systemContext = `
//         Bạn là trợ lý AI của ứng dụng PhotoGo, một nền tảng đặt lịch studio, freelancer về chủ đề chụp ảnh với nhiều concept và make up.
//         Khi phân tích ảnh:
//         - Tập trung vào các yếu tố nghệ thuật trong ảnh
//         - Đề cập đến bố cục, màu sắc, ánh sáng
//         - Đánh giá chất lượng ảnh
//         - Đưa ra gợi ý cải thiện nếu cần

//         Khi trả lời câu hỏi:
//         - Đưa ra các thông tin liên quan đến nhiếp ảnh
//         - Đưa ra các thông tin (gói, concept, make up) có sẵn trong ứng dụng PhotoGo
//         - Sử dụng ngôn ngữ thân thiện
//         - Tập trung vào chủ đề nhiếp ảnh, concept của ảnh đã đính kèm
//         - Đưa ra các gợi ý thực tế, có sẵn trong ứng dụng PhotoGo
//         - Không đưa ra các thông tin không liên quan đến nhiếp ảnh
//         - Không đưa ra các thông tin không có trong ảnh đã đính kèm
//         - Không đưa ra các thông tin không có trong ứng dụng PhotoGo
//     `;

//     constructor(
//         private configService: ConfigService,
//         @InjectRepository(ConceptVector)
//         private conceptVectorRepository: Repository<ConceptVector>,
//         @InjectRepository(ServiceConcept)
//         private serviceConceptRepository: Repository<ServiceConcept>,
//         @InjectRepository(ServiceConceptImage)
//         private serviceConceptImageRepository: Repository<ServiceConceptImage>,
//     ) {
//         const apiKey = this.configService.get<string>('gemini.apiKey');
//         if (!apiKey) {
//             this.logger.error('GEMINI_API_KEY is not defined in environment variables');
//             throw new Error('GEMINI_API_KEY is required');
//         }

//         this.genAI = new GoogleGenerativeAI(apiKey);
//         this.modelName = this.configService.get<string>('gemini.modelName') || 'gemini-2.0-flash-exp';
//         this.generationConfig = this.configService.get('gemini.generationConfig');
//         this.safetySettings = this.configService.get('gemini.safetySettings');
//     }

//     /**
//      * Calculate final price from origin price (x1.35 and round)
//      * Same logic as ServicePackageService.getFinalPrice()
//      */
//     private getFinalPrice(originPrice: number): number {
//         return Math.round(originPrice * this.TOTAL_MULTIPLIER);
//     }

//     private async initializeModel(modelName?: string) {
//         return this.genAI.getGenerativeModel({
//             model: modelName || this.modelName,
//             generationConfig: {
//                 temperature: 0.7,
//                 topP: 0.8,
//                 topK: 40,
//                 maxOutputTokens: 2048,
//             },
//         });
//     }

//     private isSuggestConceptPrompt(prompt?: string): boolean {
//         if (!prompt) return false;
//         function removeVietnameseTones(str: string): string {
//             return str.normalize('NFD')
//                 .replace(/\p{Diacritic}/gu, '')
//                 .replace(/đ/g, 'd').replace(/Đ/g, 'D');
//         }
//         const suggestKeywords = [
//             'gợi ý concept', 'tư vấn concept', 'concept phù hợp', 'suggest concept', 'recommend concept',
//             'gợi ý concept nào', 'tư vấn concept nào', 'concept nào phù hợp', 'concept suggestion', 'concept advice',
//             'gợi ý', 'tư vấn', 'suggest', 'recommend', 'recommendation', 'advice'
//         ];
//         const promptRaw = prompt.toLowerCase();
//         const promptNoTone = removeVietnameseTones(promptRaw);
//         function levenshtein(a: string, b: string): number {
//             const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
//             for (let j = 1; j <= b.length; j++) matrix[0][j] = j;
//             for (let i = 1; i <= a.length; i++) {
//                 for (let j = 1; j <= b.length; j++) {
//                     if (a[i - 1] === b[j - 1]) matrix[i][j] = matrix[i - 1][j - 1];
//                     else matrix[i][j] = Math.min(
//                         matrix[i - 1][j] + 1,
//                         matrix[i][j - 1] + 1,
//                         matrix[i - 1][j - 1] + 1
//                     );
//                 }
//             }
//             return matrix[a.length][b.length];
//         }
//         const shortPattern = /\b(goi\s*y|gợi\s*y|tu\s*van|tư\s*vấn)?\s*(conc(ept)?|con|c)?\b/i;

//         if (shortPattern.test(promptRaw) || shortPattern.test(promptNoTone)) return true;

//         return suggestKeywords.some(kw => {
//             const kwRaw = kw.toLowerCase();
//             const kwNoTone = removeVietnameseTones(kwRaw);
//             if (promptNoTone.includes(kwNoTone)) return true;
//             if (levenshtein(promptNoTone, kwNoTone) <= 4) return true;
//             if (promptRaw.includes(kwRaw)) return true;
//             if (levenshtein(promptRaw, kwRaw) <= 4) return true;
//             return false;
//         });
//     }

//     //#region Text Generation
//     async generateText(prompt: string): Promise<IGeminiResponse<any>> {
//         const startTime = Date.now();
//         if (this.isSuggestConceptPrompt(prompt) || this.isServicePrompt(prompt)) {
//             // Use injected repository
//             let concepts = await this.serviceConceptRepository.find({
//                 relations: ['images', 'servicePackage', 'servicePackage.vendor', 'servicePackage.vendor.locations'],
//                 order: { createdAt: 'ASC' },
//                 take: 5
//             });
//             let withImage = concepts.filter(c => Array.isArray(c.images) && c.images.length > 0 && c.images[0]?.imageUrl);
//             let withoutImage = concepts.filter(c => !Array.isArray(c.images) || c.images.length === 0 || !c.images[0]?.imageUrl);
//             let selected = [...withImage.slice(0, 2), ...withoutImage.slice(0, 1)];
//             if (selected.length < 3) {
//                 selected = [...withImage, ...withoutImage].slice(0, 3);
//             }

//             // Transform concepts to match concepts_same format from analyzeImageWithConcepts
//             const concepts_same = selected.map(concept => ({
//                 id: concept.id,
//                 name: concept.name ?? null,
//                 price: this.getFinalPrice(concept.price ?? 0), // Convert origin price to final price (x1.35 and round)
//                 imageUrl: Array.isArray(concept.images) && concept.images.length > 0 ? concept.images[0].imageUrl : null,
//                 vendorSlug: concept.servicePackage?.vendor?.slug ?? null,
//                 location: concept.servicePackage?.vendor?.locations ?? null,
//                 vendorId: concept.servicePackage?.vendor?.id ?? null,
//                 conceptId: concept.id,
//                 relevanceScore: 1.0, // Default high relevance for manual suggestions
//                 distance: 0.0 // Default low distance for manual suggestions
//             }));

//             const model = this.genAI.getGenerativeModel({
//                 model: GeminiModel.GEMINI_2_0_FLASH_EXP_IMAGE_GENERATION,
//                 generationConfig: { ...this.generationConfig, maxOutputTokens: 512 },
//             });
//             const enhancedPrompt = `${this.systemContext}\n\nUser: ${prompt}`;
//             const result = await model.generateContent({
//                 contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
//                 safetySettings: this.safetySettings,
//             });
//             const response = result.response.text();

//             return {
//                 success: true,
//                 data: {
//                     text: response,
//                     example: this.isServicePrompt(prompt)
//                         ? "Một số dịch vụ nổi bật của PhotoGo:"
//                         : "Một số concept nổi bật của PhotoGo:",
//                     concepts_same: concepts_same
//                 },
//                 metadata: { processingTime: Date.now() - startTime }
//             };
//         }

//         const model = await this.initializeModel();
//         const enhancedPrompt = `${this.systemContext}\n\nUser: ${prompt}`;
//         const result = await model.generateContent({
//             contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
//             safetySettings: this.safetySettings,
//         });
//         const response = result.response.text();
//         return {
//             success: true,
//             data: {
//                 text: response,
//                 sentiment: await this.analyzeSentiment(response)
//             },
//             metadata: { processingTime: Date.now() - startTime }
//         };
//     }
//     //#endregion

//     //#region Image Processing Optimization
//     /**
//      * Tối ưu: Resize và compress ảnh để tăng tốc API calls
//      */
//     private async optimizeImageForProcessing(file: Express.Multer.File): Promise<Buffer> {
//         try {
//             const sharp = require('sharp');

//             // Check if image needs resizing
//             const metadata = await sharp(file.buffer).metadata();
//             const { width = 0, height = 0 } = metadata;

//             if (width <= this.MAX_IMAGE_SIZE && height <= this.MAX_IMAGE_SIZE && file.size < 500000) {
//                 // Image is already small enough
//                 return file.buffer;
//             }

//             this.logger.debug(`Optimizing image: ${width}x${height} (${file.size} bytes) -> max ${this.MAX_IMAGE_SIZE}px`);

//             // Resize và compress
//             const optimizedBuffer = await sharp(file.buffer)
//                 .resize(this.MAX_IMAGE_SIZE, this.MAX_IMAGE_SIZE, {
//                     fit: 'inside',
//                     withoutEnlargement: true
//                 })
//                 .jpeg({ quality: this.IMAGE_QUALITY })
//                 .toBuffer();

//             this.logger.debug(`Image optimized: ${file.size} -> ${optimizedBuffer.length} bytes (${Math.round((1 - optimizedBuffer.length / file.size) * 100)}% reduction)`);
//             return optimizedBuffer;

//         } catch (error) {
//             this.logger.warn(`Failed to optimize image: ${error.message}, using original`);
//             return file.buffer;
//         }
//     }
//     //#endregion

//     //#region Helper Methods
//     private async generateImageAnalysis(imageData: any, prompt?: string): Promise<any> {
//         // const model = await this.initializeModel(GeminiModel.GEMINI_2_0_FLASH_EXP_IMAGE_GENERATION);

//         // ✅ FIX: Enhanced prompt with context validation
//         const analysisPrompt = `${this.systemContext}

// Xin chào! Mình sẽ giúp bạn phân tích bức ảnh này một cách chuyên nghiệp:

// 1. **Mô tả tổng quan**: Nội dung chính của ảnh (QUAN TRỌNG: Phải khớp với keywords đã phân tích)
// 2. **Phân tích kỹ thuật**:
//    - Bố cục và composition
//    - Ánh sáng và exposure
//    - Màu sắc và tông màu
// 3. **Gợi ý cải thiện**: Những điểm có thể nâng cao để ảnh đẹp hơn

// LƯU Ý QUAN TRỌNG: Hãy đảm bảo mô tả của bạn phù hợp với thông tin keywords được cung cấp.

// ${prompt || ''}`;

//         const result = await model.generateContent({
//             contents: [{ role: 'user', parts: [{ text: analysisPrompt }, imageData] }]
//         });

//         const analysisText = result.response.text();
//         this.logger.debug(`Generated analysis preview: ${analysisText.substring(0, 100)}...`);

//         return await this.parseImageAnalysis(analysisText);
//     }

//     // Tối ưu: Cache utilities
//     private createFileHash(buffer: Buffer): string {
//         return crypto.createHash('md5').update(buffer).digest('hex');
//     }

//     private getCached<T>(key: string): T | null {
//         const cached = this.cache.get(key);
//         if (cached && cached.expiry > Date.now()) {
//             return cached.data as T;
//         }
//         if (cached) {
//             this.cache.delete(key); // Remove expired
//         }
//         return null;
//     }

//     private setCached<T>(key: string, data: T): void {
//         this.cache.set(key, {
//             data,
//             expiry: Date.now() + this.CACHE_TTL
//         });
//     }

//     // Tối ưu: Enhanced error handling
//     private async executeWithFallback<T>(
//         operation: () => Promise<T>,
//         fallback: () => T,
//         errorMessage: string
//     ): Promise<T> {
//         try {
//             return await operation();
//         } catch (error) {
//             this.logger.error(`${errorMessage}: ${error.message}`);
//             return fallback();
//         }
//     }

//     // Tối ưu: Queue management for API rate limiting
//     private async executeWithQueue<T>(operation: () => Promise<T>): Promise<T> {
//         return new Promise((resolve, reject) => {
//             const execute = async () => {
//                 if (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS) {
//                     this.requestQueue.push(execute);
//                     return;
//                 }

//                 this.activeRequests++;
//                 try {
//                     const result = await operation();
//                     resolve(result);
//                 } catch (error) {
//                     reject(error);
//                 } finally {
//                     this.activeRequests--;
//                     if (this.requestQueue.length > 0) {
//                         const nextRequest = this.requestQueue.shift();
//                         nextRequest?.();
//                     }
//                 }
//             };
//             execute();
//         });
//     }

//     // Tối ưu: Optimized vector search with better query strategy
//     private async performOptimizedVectorSearch(queryEmbedding: number[], keywords: string[], limit: number = 5) {
//         // Use more efficient query with proper indexing hints
//         const queryBuilder = this.conceptVectorRepository.createQueryBuilder('cv');

//         return queryBuilder
//             .select([
//                 'cv.id',
//                 'cv.concept_image_id',
//                 'cv.createdAt',
//                 'cv.updatedAt'
//             ])
//             .addSelect(`(
//                 CASE WHEN EXISTS (
//                     SELECT 1 FROM unnest(cv.keywords) keyword
//                     WHERE keyword = ANY(:keywords)
//                 ) THEN 1 ELSE 0 END * 0.3 +
//                 (1 - (cv.embedding <-> :queryEmbedding::vector)) * 0.7
//             )::float as relevance_score`)
//             .addSelect('(cv.embedding <-> :queryEmbedding::vector)::float as distance')
//             .where('cv.embedding <-> :queryEmbedding::vector < :threshold', {
//                 threshold: 1.2 // ✅ FIX: Relaxed threshold to include more candidates
//             })
//             .setParameter('keywords', keywords)
//             .setParameter('queryEmbedding', `[${queryEmbedding.join(',')}]`)
//             .orderBy('relevance_score', 'DESC')
//             .limit(limit)
//             .getRawAndEntities();
//     }
//     //#endregion

//     //#region Batch Processing Methods
//     /**
//      * Tối ưu: Batch process multiple images for better performance
//      */
//     async batchAnalyzeImages(files: Express.Multer.File[], prompt?: string): Promise<IGeminiResponse<any>[]> {
//         const batchSize = this.EMBEDDING_BATCH_SIZE;
//         const results: IGeminiResponse<any>[] = [];

//         for (let i = 0; i < files.length; i += batchSize) {
//             const batch = files.slice(i, i + batchSize);
//             const batchPromises = batch.map(file =>
//                 this.executeWithQueue(() => this.analyzeImageWithConcepts(file, prompt))
//             );

//             const batchResults = await Promise.all(batchPromises);
//             results.push(...batchResults);

//             // Brief pause between batches to respect rate limits
//             if (i + batchSize < files.length) {
//                 await new Promise(resolve => setTimeout(resolve, 100));
//             }
//         }

//         return results;
//     }

//     /**
//      * Tối ưu: Batch generate embeddings for multiple texts
//      */
//     async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
//         const results: number[][] = [];

//         for (const text of texts) {
//             const embedding = await this.executeWithQueue(() => this.generateEmbedding(text));
//             results.push(embedding);
//         }

//         return results;
//     }
//     //#endregion

//     //#region Concept Vector Generation
//     async analyzeImageWithConcepts(
//         file: Express.Multer.File,
//         prompt?: string
//     ): Promise<IGeminiResponse<any>> {
//         const startTime = Date.now();
//         const metrics = {
//             startTime,
//             fileSize: file.size,
//             mimeType: file.mimetype,
//             fileName: file.originalname
//         };

//         try {
//             // Tối ưu: Optimize image trước khi process
//             const optimizedBuffer = await this.optimizeImageForProcessing(file);
//             const optimizedFile = { ...file, buffer: optimizedBuffer };

//             const model = await this.initializeModel(GeminiModel.GEMINI_2_0_FLASH_EXP_IMAGE_GENERATION);
//             const imageData = { inlineData: { data: optimizedBuffer.toString('base64'), mimeType: 'image/jpeg' } };

//             // ✅ FIX: Run sequentially to avoid AI model confusion and cache conflicts
//             this.logger.debug('Starting image analysis and keyword generation');

//             // Generate keywords first (more reliable for categorization)
//             const keywords = await this.generateKeywordsFromImage(optimizedFile);
//             this.logger.debug(`Keywords generated: [${keywords.join(', ')}]`);

//             // Then generate analysis with context from keywords
//             const enhancedPrompt = prompt ? `${prompt}\n\nKeywords từ ảnh: ${keywords.join(', ')}` : `Keywords từ ảnh: ${keywords.join(', ')}`;
//             const analysis = await this.generateImageAnalysis(imageData, enhancedPrompt);
//             this.logger.debug('Image analysis completed');

//             // ✅ FIX: Validate consistency between keywords and analysis
//             const isConsistent = this.validateKeywordAnalysisConsistency(keywords, analysis.description);
//             if (!isConsistent) {
//                 this.logger.warn(`Inconsistency detected between keywords and analysis for ${file.originalname}`);
//                 this.logger.warn(`Keywords suggest: ${this.inferContentFromKeywords(keywords)}`);
//                 this.logger.warn(`Analysis describes: ${analysis.description.substring(0, 200)}...`);
//             }

//             const queryEmbedding = await this.generateEmbedding(keywords.join(' '));
//             if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 768) {
//                 throw new Error(`Invalid query embedding: must be an array of 768 numbers`);
//             }

//             // ✅ DEBUG: Log keywords and embedding info for troubleshooting
//             this.logger.debug(`Generated keywords for search: [${keywords.join(', ')}]`);
//             this.logger.debug(`Embedding vector length: ${queryEmbedding.length}, first 5 values: [${queryEmbedding.slice(0, 5).join(', ')}]`);

//             // Tối ưu: Use optimized vector search
//             const results = await this.performOptimizedVectorSearch(queryEmbedding, keywords, 5);

//             // ✅ DEBUG: Log vector search results for troubleshooting
//             this.logger.debug(`Vector search results: found ${results.entities.length} candidates`);
//             if (results.raw.length > 0) {
//                 const bestMatch = results.raw[0];
//                 this.logger.debug(`Best match - relevance: ${bestMatch.relevance_score}, distance: ${bestMatch.distance}`);
//             }

//             // Tối ưu: Single query thay vì N+1 queries
//             const conceptImageIds = results.entities.map(e => e.concept_image_id).filter(id => id);

//             let concepts_same: any[] = [];
//             if (conceptImageIds.length > 0) {
//                 // Tối ưu: Parallel queries để giảm thời gian chờ
//                 const [conceptsData, hasGoodMatches] = await Promise.all([
//                     // Query concept data
//                     this.serviceConceptImageRepository
//                         .createQueryBuilder('sci')
//                         .leftJoinAndSelect('sci.serviceConcept', 'sc')
//                         .leftJoinAndSelect('sc.servicePackage', 'sp')
//                         .leftJoinAndSelect('sp.vendor', 'v')
//                         .leftJoinAndSelect('v.locations', 'l')
//                         .leftJoinAndSelect('sc.images', 'img')
//                         .where('sci.id IN (:...ids)', { ids: conceptImageIds })
//                         .orderBy('img.createdAt', 'ASC')
//                         .getMany(),
//                     // Check relevance scores in parallel
//                     Promise.resolve(results.entities.some(e => parseFloat(results.raw.find(r => r.cv_id === e.id)?.relevance_score || '0') > this.RELEVANCE_THRESHOLD))
//                 ]);

//                 // Map results efficiently
//                 const conceptDataMap = new Map();
//                 conceptsData.forEach(sci => {
//                     conceptDataMap.set(sci.id, {
//                         conceptId: sci.serviceConceptId,
//                         name: sci.serviceConcept?.name ?? null,
//                         price: this.getFinalPrice(sci.serviceConcept?.price ?? 0), // Convert origin price to final price (x1.35 and round)
//                         imageUrl: sci.serviceConcept?.images?.[0]?.imageUrl ?? null,
//                         vendorSlug: sci.serviceConcept?.servicePackage?.vendor?.slug ?? null,
//                         location: sci.serviceConcept?.servicePackage?.vendor?.locations ?? null,
//                         vendorId: sci.serviceConcept?.servicePackage?.vendor?.id ?? null
//                     });
//                 });

//                 concepts_same = results.entities.map((entity, index) => {
//                     const { embedding, ...rest } = entity;
//                     const conceptData = conceptDataMap.get(entity.concept_image_id) || {};

//                     return {
//                         ...rest,
//                         ...conceptData,
//                         conceptId: conceptData.conceptId || null,
//                         relevanceScore: parseFloat(results.raw[index].relevance_score),
//                         distance: parseFloat(results.raw[index].distance)
//                     };
//                 });
//             }

//             // Keywords chi tiết cho CON NGƯỜI
//             const peopleKeywords = [
//                 // Giới tính & độ tuổi
//                 'nữ', 'nam', 'girl', 'boy', 'woman', 'man', 'người', 'person', 'people', 'human',
//                 'trẻ em', 'children', 'kid', 'child', 'thiếu niên', 'teenager', 'teen', 'adult', 'người lớn',
//                 'bé', 'baby', 'infant', 'newborn', 'trẻ sơ sinh', 'toddler', 'bé yêu',
//                 'người cao tuổi', 'elderly', 'senior', 'grandmother', 'grandfather', 'bà', 'ông',

//                 // Loại chụp người
//                 'portrait', 'chân dung', 'headshot', 'selfie', 'group photo', 'group', 'nhóm',
//                 'family', 'gia đình', 'couple', 'cặp đôi', 'duo', 'team', 'đội nhóm',

//                 // Sự kiện & dịp đặc biệt
//                 'wedding', 'cưới', 'bride', 'cô dâu', 'groom', 'chú rể', 'engagement', 'đính hôn',
//                 'maternity', 'bầu bí', 'mang thai', 'pregnancy', 'thai sản',
//                 'graduation', 'tốt nghiệp', 'birthday', 'sinh nhật', 'anniversary', 'kỷ niệm',

//                 // Phong cách & thể loại
//                 'fashion', 'thời trang', 'model', 'modeling', 'beauty', 'makeup', 'trang điểm',
//                 'cosplay', 'costume', 'trang phục', 'áo dài', 'traditional dress',
//                 'street style', 'đường phố', 'casual', 'formal', 'trang trọng',

//                 // Cảm xúc & biểu cảm
//                 'smile', 'cười', 'laugh', 'happy', 'vui vẻ', 'sad', 'buồn', 'serious', 'nghiêm túc',
//                 'emotion', 'cảm xúc', 'expression', 'biểu cảm', 'eyes', 'mắt', 'face', 'khuôn mặt'
//             ];

//             // Keywords chi tiết cho CON VẬT
//             const animalKeywords = [
//                 // Thú cưng phổ biến
//                 'pet', 'thú cưng', 'domestic animal', 'động vật nuôi',
//                 'cat', 'mèo', 'kitten', 'mèo con', 'feline', 'persian cat', 'british shorthair',
//                 'dog', 'chó', 'puppy', 'chó con', 'canine', 'golden retriever', 'husky', 'poodle',
//                 'rabbit', 'thỏ', 'bunny', 'hamster', 'chuột hamster', 'guinea pig',
//                 'bird', 'chim', 'parrot', 'vẹt', 'canary', 'chim cảnh',

//                 // Động vật hoang dã
//                 'wildlife', 'động vật hoang dã', 'wild animal', 'safari',
//                 'elephant', 'voi', 'lion', 'sư tử', 'tiger', 'hổ', 'leopard', 'báo',
//                 'bear', 'gấu', 'wolf', 'sói', 'fox', 'cáo', 'deer', 'hươu',
//                 'monkey', 'khỉ', 'gorilla', 'đười ươi', 'panda', 'gấu trúc',

//                 // Động vật biển
//                 'marine animal', 'động vật biển', 'fish', 'cá', 'dolphin', 'cá heo',
//                 'whale', 'cá voi', 'shark', 'cá mập', 'sea turtle', 'rùa biển',

//                 // Côn trùng & động vật nhỏ
//                 'insect', 'côn trùng', 'butterfly', 'bướm', 'bee', 'ong', 'spider', 'nhện',
//                 'lizard', 'thằn lằn', 'snake', 'rắn', 'frog', 'ếch',

//                 // Hành vi động vật
//                 'playing', 'chơi đùa', 'sleeping', 'ngủ', 'eating', 'ăn', 'running', 'chạy',
//                 'flying', 'bay', 'swimming', 'bơi', 'hunting', 'săn mồi', 'cute', 'dễ thương',
//                 'animal portrait', 'chân dung động vật', 'animal behavior', 'hành vi động vật'
//             ];

//             // Keywords chi tiết cho CẢNH VẬT & THIÊN NHIÊN
//             const landscapeKeywords = [
//                 // Địa hình & cảnh quan
//                 'landscape', 'phong cảnh', 'scenery', 'cảnh đẹp', 'natural scenery', 'cảnh thiên nhiên',
//                 'mountain', 'núi', 'hill', 'đồi', 'valley', 'thung lũng', 'canyon', 'hẻm núi',
//                 'beach', 'bãi biển', 'ocean', 'đại dương', 'sea', 'biển', 'lake', 'hồ',
//                 'river', 'sông', 'stream', 'suối', 'waterfall', 'thác nước', 'pond', 'ao',
//                 'forest', 'rừng', 'jungle', 'rừng nhiệt đới', 'woods', 'khu rừng',
//                 'desert', 'sa mạc', 'field', 'cánh đồng', 'meadow', 'đồng cỏ',
//                 'island', 'đảo', 'archipelago', 'quần đảo', 'peninsula', 'bán đảo',

//                 // Thời tiết & khí hậu
//                 'sunrise', 'bình minh', 'sunset', 'hoàng hôn', 'dawn', 'rạng đông', 'dusk', 'chạng vạng',
//                 'cloudy', 'nhiều mây', 'storm', 'bão', 'rain', 'mưa', 'snow', 'tuyết',
//                 'fog', 'sương mù', 'mist', 'sương', 'rainbow', 'cầu vồng',
//                 'sunny', 'nắng', 'clear sky', 'trời trong', 'blue sky', 'trời xanh',

//                 // Thực vật
//                 'tree', 'cây', 'flower', 'hoa', 'grass', 'cỏ', 'leaf', 'lá',
//                 'cherry blossom', 'hoa anh đào', 'lotus', 'hoa sen', 'sunflower', 'hoa hướng dương',
//                 'garden', 'vườn', 'park', 'công viên', 'botanical', 'thực vật học',

//                 // Môi trường ngoài trời
//                 'outdoor', 'ngoài trời', 'nature', 'thiên nhiên', 'wilderness', 'hoang dã',
//                 'countryside', 'nông thôn', 'rural', 'vùng quê', 'natural', 'tự nhiên',
//                 'environment', 'môi trường', 'ecosystem', 'hệ sinh thái',

//                 // Kiến trúc & công trình
//                 'architecture', 'kiến trúc', 'building', 'tòa nhà', 'skyscraper', 'tòa nhà chọc trời',
//                 'bridge', 'cầu', 'tower', 'tháp', 'castle', 'lâu đài', 'temple', 'đền',
//                 'church', 'nhà thờ', 'pagoda', 'chùa', 'monument', 'tượng đài',
//                 'cityscape', 'cảnh thành phố', 'urban', 'đô thị', 'street', 'đường phố'
//             ];

//             // Keywords chi tiết cho ĐỒ VẬT & SẢN PHẨM
//             const objectKeywords = [
//                 // Đồ vật sinh hoạt
//                 'object', 'đồ vật', 'item', 'vật phẩm', 'thing', 'stuff', 'belongings', 'đồ đạc',
//                 'furniture', 'nội thất', 'chair', 'ghế', 'table', 'bàn', 'bed', 'giường',
//                 'lamp', 'đèn', 'mirror', 'gương', 'clock', 'đồng hồ', 'vase', 'lọ hoa',

//                 // Đồ ăn & thức uống
//                 'food', 'đồ ăn', 'meal', 'bữa ăn', 'dish', 'món ăn', 'cuisine', 'ẩm thực',
//                 'fruit', 'trái cây', 'apple', 'táo', 'orange', 'cam', 'banana', 'chuối',
//                 'vegetable', 'rau củ', 'tomato', 'cà chua', 'carrot', 'cà rốt',
//                 'bread', 'bánh mì', 'cake', 'bánh', 'coffee', 'cà phê', 'tea', 'trà',
//                 'wine', 'rượu vang', 'beer', 'bia', 'cocktail', 'đồ uống pha chế',
//                 'dessert', 'tráng miệng', 'chocolate', 'sô cô la', 'ice cream', 'kem',

//                 // Sản phẩm & hàng hóa
//                 'product', 'sản phẩm', 'merchandise', 'hàng hóa', 'goods', 'commodity',
//                 'still life', 'tĩnh vật', 'product photography', 'chụp sản phẩm',
//                 'commercial', 'thương mại', 'advertising', 'quảng cáo', 'marketing',

//                 // Công nghệ & thiết bị
//                 'technology', 'công nghệ', 'device', 'thiết bị', 'gadget', 'đồ chơi công nghệ',
//                 'phone', 'điện thoại', 'computer', 'máy tính', 'laptop', 'máy tính xách tay',
//                 'camera', 'máy ảnh', 'headphone', 'tai nghe', 'watch', 'đồng hồ đeo tay',

//                 // Phương tiện & xe cộ
//                 'vehicle', 'phương tiện', 'car', 'ô tô', 'motorcycle', 'xe máy',
//                 'bicycle', 'xe đạp', 'truck', 'xe tải', 'bus', 'xe buýt',
//                 'boat', 'thuyền', 'ship', 'tàu', 'airplane', 'máy bay',

//                 // Quần áo & phụ kiện
//                 'clothing', 'quần áo', 'fashion item', 'vật phẩm thời trang',
//                 'shoes', 'giày', 'bag', 'túi', 'hat', 'mũ', 'glasses', 'kính',
//                 'jewelry', 'trang sức', 'watch', 'đồng hồ', 'accessory', 'phụ kiện',

//                 // Đồ chơi & giải trí
//                 'toy', 'đồ chơi', 'game', 'trò chơi', 'book', 'sách', 'magazine', 'tạp chí',
//                 'music instrument', 'nhạc cụ', 'guitar', 'đàn guitar', 'piano', 'đàn piano',

//                 // Văn phòng phẩm & học tập
//                 'stationery', 'văn phòng phẩm', 'pen', 'bút', 'pencil', 'bút chì',
//                 'notebook', 'sổ tay', 'paper', 'giấy', 'document', 'tài liệu',

//                 // Đồ trang trí & nghệ thuật
//                 'decoration', 'đồ trang trí', 'artwork', 'tác phẩm nghệ thuật',
//                 'painting', 'tranh', 'sculpture', 'điêu khắc', 'craft', 'thủ công',
//                 'antique', 'đồ cổ', 'vintage', 'cổ điển', 'collectible', 'đồ sưu tập'
//             ];

//             // ✅ FIX: Giảm threshold để tăng khả năng match concepts phù hợp
//             const RELEVANCE_THRESHOLD = 0.2; // Giảm từ 0.4 xuống 0.2 để bao gồm nhiều matches hợp lý hơn

//             // Phân loại ảnh input dựa trên keywords với độ chính xác cao
//             const inputImageType = this.categorizeImageByKeywords(keywords, peopleKeywords, animalKeywords, landscapeKeywords, objectKeywords);
//             this.logger.debug(`Image categorized as: ${inputImageType}, keywords: ${keywords.join(', ')}`);

//             const hasGoodMatches = concepts_same.some(c => c.relevanceScore > RELEVANCE_THRESHOLD);

//             if (!hasGoodMatches) {
//                 this.logger.debug(`No concepts with good relevance scores. Best score: ${Math.max(...concepts_same.map(c => c.relevanceScore))}`);
//                 // Jump to fallback logic
//                 concepts_same = [];
//             } else {
//                 // ✅ FIX: Enhanced semantic filtering với strict category matching
//                 concepts_same = concepts_same.filter(c => {
//                     // Điều kiện 1: Relevance score đủ cao
//                     if (c.relevanceScore <= RELEVANCE_THRESHOLD) {
//                         return false;
//                     }

//                     // Điều kiện 2: Strict semantic filtering - KHÔNG cho phép bypass
//                     const conceptType = this.categorizeConceptByName(c.name || '');

//                     // ✅ DEBUG: Log categorization results
//                     this.logger.debug(`Concept "${c.name}" categorized as "${conceptType}" for "${inputImageType}" image`);

//                     // ✅ FIX: STRICT FILTERING - không cho phép cross-category matches
//                     if (inputImageType !== 'unknown') {
//                         // Nếu ảnh là động vật -> CHỈ cho phép concept động vật hoặc unknown
//                         if (inputImageType === 'animal' && conceptType !== 'animal' && conceptType !== 'unknown') {
//                             this.logger.debug(`🚫 Filtered out non-animal concept "${c.name}" for animal image (concept type: ${conceptType})`);
//                             return false;
//                         }

//                         // Nếu ảnh là người -> CHỈ cho phép concept người hoặc unknown
//                         if (inputImageType === 'people' && conceptType !== 'people' && conceptType !== 'unknown') {
//                             this.logger.debug(`🚫 Filtered out non-people concept "${c.name}" for people image (concept type: ${conceptType})`);
//                             return false;
//                         }

//                         // Nếu ảnh là cảnh vật -> CHỈ cho phép concept cảnh vật hoặc unknown
//                         if (inputImageType === 'landscape' && conceptType !== 'landscape' && conceptType !== 'unknown') {
//                             this.logger.debug(`🚫 Filtered out non-landscape concept "${c.name}" for landscape image (concept type: ${conceptType})`);
//                             return false;
//                         }

//                         // Nếu ảnh là đồ vật -> CHỈ cho phép concept đồ vật hoặc unknown
//                         if (inputImageType === 'object' && conceptType !== 'object' && conceptType !== 'unknown') {
//                             this.logger.debug(`🚫 Filtered out non-object concept "${c.name}" for object image (concept type: ${conceptType})`);
//                             return false;
//                         }

//                         // ✅ NEW: Extra strict filtering for strong animal images
//                         if (inputImageType === 'animal') {
//                             const hasStrongAnimalKeywords = ['mèo', 'chó', 'cat', 'dog', 'thú cưng', 'pet', 'động vật', 'animal'].some(kw =>
//                                 keywords.join(' ').toLowerCase().includes(kw)
//                             );

//                             if (hasStrongAnimalKeywords && conceptType === 'unknown') {
//                                 // For strong animal images, unknown concepts must have animal-related terms
//                                 const conceptName = (c.name || '').toLowerCase();
//                                 const hasAnimalRelatedTerms = ['pet', 'thú cưng', 'mèo', 'chó', 'cat', 'dog', 'animal', 'động vật', 'cute', 'dễ thương'].some(term =>
//                                     conceptName.includes(term)
//                                 );

//                                 if (!hasAnimalRelatedTerms) {
//                                     this.logger.debug(`🚫 Filtered out unknown concept "${c.name}" for strong animal image (no animal terms)`);
//                                     return false;
//                                 }
//                             }
//                         }

//                         // ✅ NEW: Chỉ cho phép high relevance score bypass cho unknown concepts với điều kiện
//                         if (conceptType === 'unknown' && c.relevanceScore > 0.6) {
//                             this.logger.debug(`✅ High relevance unknown concept "${c.name}" passed filtering (score: ${c.relevanceScore})`);
//                             return true;
//                         }
//                     }

//                     return true;
//                 });

//                 this.logger.debug(`After enhanced semantic filtering: ${concepts_same.length} concepts remaining`);

//                 // ✅ ENHANCED: Universal semantic mismatch detection
//                 concepts_same = concepts_same.filter(c => {
//                     const keywordString = keywords.join(' ').toLowerCase();
//                     const conceptName = (c.name || '').toLowerCase();

//                     const imageCategory = this.detectAdvancedImageCategory(keywords);
//                     const conceptCategory = this.detectConceptCategory(c.name || '');

//                     // Check for strong mismatches
//                     const mismatchScore = this.calculateMismatchPenalty(imageCategory, conceptCategory);

//                     if (mismatchScore > 0.7) { // Strong mismatch
//                         this.logger.debug(`🚫 Rejecting mismatched concept "${c.name}" (${conceptCategory}) for ${imageCategory} image (mismatch: ${mismatchScore})`);
//                         return false;
//                     }

//                     return true;
//                 });

//                 this.logger.debug(`After semantic mismatch filtering: ${concepts_same.length} concepts remaining`);

//                 // Thêm validation: Nếu ảnh rõ ràng là động vật mà không có concept nào phù hợp -> trả về rỗng
//                 if (inputImageType === 'animal' && concepts_same.length === 0) {
//                     this.logger.debug(`No animal concepts found for animal image. Will use fallback.`);
//                 }
//             }

//             if (!concepts_same || concepts_same.length === 0) {
//                 // ✅ ENHANCED FALLBACK: Better messaging for no matches
//                 let fallbackConcepts: any[];
//                 let fallbackMessage = '';

//                 // ✅ ENHANCED: Universal fallback for special image categories
//                 const imageCategory = this.detectAdvancedImageCategory(keywords);

//                 const specialCategoryMessages = {
//                     'sci-fi-space': 'Hiện tại PhotoGo chưa có concept chụp ảnh vũ trụ, khoa học viễn tưởng. Bạn có thể tham khảo các concept chụp ảnh khác phù hợp với nhu cầu của mình.',
//                     'military-vehicle': 'Hiện tại PhotoGo chưa có concept chụp ảnh xe quân sự, vũ khí. Bạn có thể tham khảo các concept chụp ảnh khác phù hợp với nhu cầu của mình.',
//                     'robot-ai': 'Hiện tại PhotoGo chưa có concept chụp ảnh robot, trí tuệ nhân tạo. Bạn có thể tham khảo các concept chụp ảnh khác phù hợp với nhu cầu của mình.',
//                     'fantasy': 'Hiện tại PhotoGo chưa có concept chụp ảnh fantasy, thần thoại. Bạn có thể tham khảo các concept chụp ảnh khác phù hợp với nhu cầu của mình.',
//                     'abstract-art': 'Hiện tại PhotoGo chưa có concept chụp ảnh nghệ thuật trừu tượng. Bạn có thể tham khảo các concept chụp ảnh khác phù hợp với nhu cầu của mình.',
//                     'extreme-sport': 'Hiện tại PhotoGo chưa có concept chụp ảnh thể thao mạo hiểm. Bạn có thể tham khảo các concept chụp ảnh khác phù hợp với nhu cầu của mình.',
//                     'advanced-architecture': 'Hiện tại PhotoGo chưa có concept chụp ảnh kiến trúc hiện đại, futuristic. Bạn có thể tham khảo các concept chụp ảnh khác phù hợp với nhu cầu của mình.'
//                 };

//                 if (specialCategoryMessages[imageCategory]) {
//                     this.logger.debug(`Special category detected: ${imageCategory} - no suitable concepts available`);
//                     fallbackMessage = specialCategoryMessages[imageCategory];

//                     // Return general concepts instead of trying to match
//                     const generalConcepts = await this.serviceConceptRepository.find({
//                         relations: ['images', 'servicePackage', 'servicePackage.vendor', 'servicePackage.vendor.locations'],
//                         where: { status: ServiceConceptStatus.ACTIVE },
//                         order: { createdAt: 'DESC' },
//                         take: 3
//                     });

//                     fallbackConcepts = generalConcepts;
//                 } else if (inputImageType === 'animal') {
//                     // ✅ FIX: Tìm concept động vật tốt nhất với priority cao hơn
//                     this.logger.debug('Looking for animal concepts as fallback');
//                     const allConcepts = await this.serviceConceptRepository.find({
//                         relations: ['images', 'servicePackage', 'servicePackage.vendor', 'servicePackage.vendor.locations'],
//                         where: { status: ServiceConceptStatus.ACTIVE },
//                         order: { createdAt: 'DESC' },
//                         take: 50 // ✅ FIX: Lấy nhiều hơn để có nhiều lựa chọn filter
//                     });

//                     // ✅ FIX: Prioritize concepts có từ khóa động vật rõ ràng với expanded keywords
//                     const strongAnimalKeywords = ['con vật', 'động vật', 'thú cưng', 'pet', 'mèo', 'chó', 'cat', 'dog', 'animal', 'kitten', 'puppy', 'pet portrait'];
//                     const weakAnimalKeywords = ['cute', 'dễ thương', 'adorable', 'furry', 'fluffy'];

//                     const strongAnimalConcepts = allConcepts.filter(concept => {
//                         const name = concept.name?.toLowerCase() || '';
//                         return strongAnimalKeywords.some(keyword => name.includes(keyword));
//                     });

//                     // Filter concept động vật với extended categorization
//                     const otherAnimalConcepts = allConcepts.filter(concept => {
//                         const name = concept.name?.toLowerCase() || '';
//                         if (strongAnimalKeywords.some(keyword => name.includes(keyword))) return false; // Đã có trong strong

//                         // Check if it's categorized as animal OR has weak animal indicators
//                         const conceptType = this.categorizeConceptByName(concept.name || '');
//                         const hasWeakAnimalKeywords = weakAnimalKeywords.some(keyword => name.includes(keyword));

//                         return conceptType === 'animal' || hasWeakAnimalKeywords;
//                     });

//                     // ✅ FIX: Combine với priority: strong animal concepts trước
//                     fallbackConcepts = [...strongAnimalConcepts.slice(0, 2), ...otherAnimalConcepts.slice(0, 1)]; // Lấy 3 concept động vật tốt nhất

//                     if (fallbackConcepts.length === 0) {
//                         // Nếu không có concept động vật nào, lấy concept general
//                         fallbackConcepts = allConcepts.slice(0, 3);
//                         fallbackMessage = 'Không tìm thấy concept động vật phù hợp. Đây là một số concept khác bạn có thể tham khảo.';
//                     } else {
//                         fallbackMessage = `Tìm thấy ${fallbackConcepts.length} concept động vật phù hợp với ảnh của bạn!`;
//                     }
//                 } else if (inputImageType === 'people') {
//                     // Tương tự cho người
//                     this.logger.debug('Looking for people concepts as fallback');
//                     const allConcepts = await this.serviceConceptRepository.find({
//                         relations: ['images', 'servicePackage', 'servicePackage.vendor', 'servicePackage.vendor.locations'],
//                         where: { status: ServiceConceptStatus.ACTIVE },
//                         order: { createdAt: 'DESC' },
//                         take: 20
//                     });

//                     fallbackConcepts = allConcepts.filter(concept => {
//                         const conceptType = this.categorizeConceptByName(concept.name || '');
//                         return conceptType === 'people';
//                     }).slice(0, 3);

//                     if (fallbackConcepts.length === 0) {
//                         fallbackConcepts = allConcepts.slice(0, 3);
//                         fallbackMessage = 'Không tìm thấy concept chụp người phù hợp. Đây là một số concept khác bạn có thể tham khảo.';
//                     } else {
//                         fallbackMessage = `Tìm thấy ${fallbackConcepts.length} concept chụp người phù hợp với ảnh của bạn!`;
//                     }
//                 } else {
//                     // Fallback chung cho các loại khác
//                     fallbackConcepts = await this.serviceConceptRepository.find({
//                         relations: ['images', 'servicePackage', 'servicePackage.vendor', 'servicePackage.vendor.locations'],
//                         where: { status: ServiceConceptStatus.ACTIVE },
//                         order: { createdAt: 'DESC' },
//                         take: 5
//                     });
//                     fallbackMessage = 'PhotoGo có rất nhiều concept đa dạng và thú vị bạn có thể khám phá!';
//                 }

//                 const fallbackConceptsSame = await Promise.all(fallbackConcepts.map(async (concept) => {
//                     let vendorSlug: string | null = null;
//                     let vendorLocations: Location[] | null = null;
//                     let vendorId: string | null = null;

//                     if (concept.servicePackage?.vendor) {
//                         vendorSlug = concept.servicePackage.vendor.slug ?? null;
//                         vendorLocations = concept.servicePackage.vendor.locations ?? null;
//                         vendorId = concept.servicePackage.vendor.id ?? null;
//                     }

//                     return {
//                         id: concept.id,
//                         name: concept.name ?? null,
//                         price: this.getFinalPrice(concept.price ?? 0), // Convert origin price to final price (x1.35 and round)
//                         imageUrl: concept.images?.[0]?.imageUrl ?? null,
//                         vendorSlug,
//                         location: vendorLocations,
//                         vendorId,
//                         conceptId: concept.id,
//                         relevanceScore: inputImageType === this.categorizeConceptByName(concept.name || '') ? 0.7 : 0.3, // Higher score for matching type
//                         distance: inputImageType === this.categorizeConceptByName(concept.name || '') ? 0.5 : 1.0
//                     };
//                 }));

//                 // Tạo prompt cho AI để giải thích
//                 const model = await this.initializeModel(GeminiModel.GEMINI_2_0_FLASH_EXP_IMAGE_GENERATION);
//                 const imageData = { inlineData: { data: file.buffer.toString('base64'), mimeType: file.mimetype } };

//                 const fallbackPrompt = `${this.systemContext}

// Xin chào! Mình đã phân tích ảnh ${inputImageType} này và có một vài thông tin để chia sẻ:

// 1. **Mô tả về ảnh**: Nội dung và đặc điểm chính
// 2. **Về việc tìm kiếm concept**: ${fallbackMessage}
// 3. **Gợi ý tích cực**: Các concept dưới đây có thể phù hợp với nhu cầu của bạn

// Tone thân thiện, tích cực và khuyến khích.`;

//                 const fallbackResult = await model.generateContent({
//                     contents: [{ role: 'user', parts: [{ text: fallbackPrompt }, imageData] }]
//                 });

//                 const fallbackAnalysis = await this.parseImageAnalysis(fallbackResult.response.text());

//                 // ✅ Generate dynamic example for fallback flow too
//                 let fallbackExample: string;
//                 const isSpecialCategory = ['sci-fi-space', 'military-vehicle', 'robot-ai', 'fantasy', 'abstract-art', 'extreme-sport', 'advanced-architecture'].includes(imageCategory);

//                 if (isSpecialCategory) {
//                     fallbackExample = "Một số concept chụp ảnh khác có thể phù hợp:";
//                 } else {
//                     fallbackExample = this.generateExampleText(inputImageType, fallbackConceptsSame, keywords);
//                 }

//                 return {
//                     success: true,
//                     data: {
//                         analysis: fallbackAnalysis,
//                         example: fallbackExample, // ✅ Dynamic example for fallback too
//                         concepts_same: fallbackConceptsSame,
//                         isNoMatch: inputImageType !== 'unknown', // Only mark as no match if we can classify the image
//                         suggestion: fallbackMessage
//                     },
//                     metadata: {
//                         filename: file.originalname,
//                         size: file.size,
//                         mimeType: file.mimetype,
//                         processingTime: Date.now() - startTime,
//                         message: `Đã tìm thấy ${fallbackConceptsSame.length} concept phù hợp với loại ảnh ${inputImageType}.`
//                     }
//                 };
//             }

//             // ✅ FIX: Success flow should also include message fields for consistency
//             const conceptCount = concepts_same.length;
//             const bestScore = conceptCount > 0 ? Math.max(...concepts_same.map(c => c.relevanceScore)).toFixed(2) : '0';

//             // ✅ Generate dynamic example text based on image type and concepts
//             // ✅ FIX: Handle special image categories in success flow too
//             const imageCategory = this.detectAdvancedImageCategory(keywords);
//             const isSpecialCategory = ['sci-fi-space', 'military-vehicle', 'robot-ai', 'fantasy', 'abstract-art', 'extreme-sport', 'advanced-architecture'].includes(imageCategory);

//             const dynamicExample = isSpecialCategory
//                 ? "Concept chụp ảnh tổng hợp:"
//                 : this.generateExampleText(inputImageType, concepts_same, keywords);

//             return {
//                 success: true,
//                 data: {
//                     analysis,
//                     example: dynamicExample, // ✅ Dynamic AI-generated example
//                     concepts_same,
//                     isNoMatch: false, // ✅ FIX: Explicitly mark as successful match
//                     suggestion: `Tìm thấy ${conceptCount} concept phù hợp với ảnh của bạn! (Điểm tương đồng cao nhất: ${bestScore})`
//                 },
//                 metadata: {
//                     filename: file.originalname,
//                     size: file.size,
//                     mimeType: file.mimetype,
//                     processingTime: Date.now() - startTime,
//                     message: `Đã tìm thấy ${conceptCount} concept phù hợp với loại ảnh ${inputImageType}.` // ✅ FIX: Add message to success flow
//                 }
//             };
//         } catch (error) {
//             this.logger.error(`Error analyzing image with concepts: ${error.message}`, error.stack);
//             return {
//                 success: false,
//                 data: null,
//                 metadata: {
//                     ...metrics,
//                     processingTime: Date.now() - startTime,
//                     message: 'Lỗi phân tích ảnh với concept.'
//                 }
//             };
//         } finally {
//             // Log performance metrics
//             const finalMetrics = {
//                 ...metrics,
//                 processingTime: Date.now() - startTime,
//                 success: true
//             };
//             this.logger.log('Image analysis performance', finalMetrics);

//             // Clear cache if it gets too large (simple memory management)
//             if (this.cache.size > 1000) {
//                 const oldestKeys = Array.from(this.cache.keys()).slice(0, 500);
//                 oldestKeys.forEach(key => this.cache.delete(key));
//                 this.logger.debug('Cache cleanup: removed 500 oldest entries');
//             }
//         }
//     }
//     // #endregion

//     private async parseImageAnalysis(text: string) {
//         return {
//             description: text,
//             technicalAnalysis: {
//                 composition: this.extractComposition(text),
//                 lighting: this.extractLighting(text),
//                 colors: this.extractColors(text)
//             },
//             suggestions: this.extractSuggestions(text),
//         };
//     }

//     private extractSuggestions(text: string): string[] {
//         const suggestions: string[] = [];
//         const lines = text.split('\n');
//         for (const line of lines) {
//             if (/suggestion|improvement|gợi ý|cải thiện/i.test(line)) {
//                 suggestions.push(line.trim());
//             }
//         }
//         return suggestions;
//     }

//     private extractColors(text: string): string[] {
//         const colorList = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'gray', 'brown', 'cyan', 'magenta'];
//         const foundColors = colorList.filter(color => new RegExp(`\\b${color}\\b`, 'i').test(text));
//         return foundColors;
//     }

//     private extractLighting(text: string): string {
//         const lines = text.split('\n');
//         for (const line of lines) {
//             if (/lighting|ánh sáng/i.test(line)) {
//                 return line.trim();
//             }
//         }
//         return '';
//     }

//     private extractComposition(text: string): string {
//         const lines = text.split('\n');
//         for (const line of lines) {
//             if (/composition|bố cục/i.test(line)) {
//                 return line.trim();
//             }
//         }
//         return '';
//     }

//     private async analyzeSentiment(text: string): Promise<string> {
//         const positiveWords = ['beautiful', 'great', 'excellent', 'good', 'amazing', 'đẹp', 'tuyệt vời', 'xuất sắc', 'tốt'];
//         const negativeWords = ['poor', 'bad', 'terrible', 'worst', 'horrible', 'tệ', 'xấu', 'dở'];
//         const lowercaseText = text.toLowerCase();
//         const positiveCount = positiveWords.filter(word => lowercaseText.includes(word)).length;
//         const negativeCount = negativeWords.filter(word => lowercaseText.includes(word)).length;
//         return positiveCount > negativeCount ? 'positive' : negativeCount > positiveCount ? 'negative' : 'neutral';
//     }

//     /**
//      * ✅ Validate consistency between keywords and analysis description
//      */
//     private validateKeywordAnalysisConsistency(keywords: string[], analysisDescription: string): boolean {
//         const keywordString = keywords.join(' ').toLowerCase();
//         const analysisLower = analysisDescription.toLowerCase();

//         // Check for major content type consistency
//         const hasAnimalKeywords = ['mèo', 'chó', 'cat', 'dog', 'thú cưng', 'pet', 'động vật', 'animal'].some(kw => keywordString.includes(kw));
//         const hasPeopleKeywords = ['người', 'nam', 'nữ', 'cặp đôi', 'couple', 'family', 'gia đình', 'portrait', 'chân dung'].some(kw => keywordString.includes(kw));
//         const hasLandscapeKeywords = ['phong cảnh', 'landscape', 'thác', 'waterfall', 'núi', 'mountain', 'biển', 'sea'].some(kw => keywordString.includes(kw));

//         const analysisHasAnimal = ['chó', 'mèo', 'dog', 'cat', 'thú cưng', 'pet', 'động vật', 'animal'].some(word => analysisLower.includes(word));
//         const analysisHasPeople = ['người', 'nam', 'nữ', 'cặp đôi', 'couple', 'family', 'gia đình'].some(word => analysisLower.includes(word));
//         const analysisHasLandscape = ['phong cảnh', 'landscape', 'thác', 'waterfall', 'núi', 'mountain'].some(word => analysisLower.includes(word));

//         // Major inconsistencies
//         if (hasAnimalKeywords && analysisHasPeople && !analysisHasAnimal) return false;
//         if (hasPeopleKeywords && analysisHasAnimal && !analysisHasPeople) return false;
//         if (hasLandscapeKeywords && (analysisHasAnimal || analysisHasPeople) && !analysisHasLandscape) return false;

//         return true;
//     }

//     /**
//      * ✅ Infer content type from keywords for debugging
//      */
//     private inferContentFromKeywords(keywords: string[]): string {
//         const keywordString = keywords.join(' ').toLowerCase();

//         if (['mèo', 'chó', 'cat', 'dog', 'thú cưng', 'pet', 'động vật', 'animal'].some(kw => keywordString.includes(kw))) {
//             return 'Động vật/Thú cưng';
//         }
//         if (['người', 'nam', 'nữ', 'cặp đôi', 'couple', 'family', 'gia đình', 'portrait', 'chân dung'].some(kw => keywordString.includes(kw))) {
//             return 'Người/Portrait';
//         }
//         if (['phong cảnh', 'landscape', 'thác', 'waterfall', 'núi', 'mountain', 'biển', 'sea'].some(kw => keywordString.includes(kw))) {
//             return 'Phong cảnh/Landscape';
//         }

//         return 'Không xác định';
//     }

//     /**
//      * ✅ Advanced image category detection for comprehensive filtering
//      */
//     private detectAdvancedImageCategory(keywords: string[]): string {
//         const keywordString = keywords.join(' ').toLowerCase();

//         // ✅ FIX: Check standard categories FIRST to avoid misclassification
//         // Animals - highest priority to avoid confusion
//         if (['mèo', 'chó', 'cat', 'dog', 'pet', 'thú cưng', 'động vật', 'animal', 'kitten', 'puppy'].some(kw => keywordString.includes(kw))) {
//             return 'animal';
//         }

//         // People - high priority
//         if (['người', 'nam', 'nữ', 'cặp đôi', 'couple', 'family', 'gia đình', 'portrait', 'chân dung', 'baby', 'bé'].some(kw => keywordString.includes(kw))) {
//             return 'people';
//         }

//         // Landscape - high priority
//         if (['phong cảnh', 'landscape', 'thác', 'waterfall', 'núi', 'mountain', 'biển', 'sea', 'thiên nhiên', 'nature'].some(kw => keywordString.includes(kw))) {
//             return 'landscape';
//         }

//         // Objects - high priority
//         if (['đồ ăn', 'food', 'sản phẩm', 'product', 'object', 'still life'].some(kw => keywordString.includes(kw))) {
//             return 'object';
//         }

//         // Special categories only checked AFTER standard categories
//         // Sci-fi & Technology
//         if (['vũ trụ', 'space', 'galaxy', 'star', 'planet', 'satellite', 'astronaut', 'rocket', 'cosmos', 'nebula'].some(kw => keywordString.includes(kw))) {
//             return 'sci-fi-space';
//         }

//         // Military & Vehicles
//         if (['xe tăng', 'tank', 'military', 'quân sự', 'armor', 'weapon', 'chiến đấu', 'máy bay chiến đấu', 'fighter jet', 'helicopter', 'tàu chiến', 'submarine'].some(kw => keywordString.includes(kw))) {
//             return 'military-vehicle';
//         }

//         // Robots & AI
//         if (['robot', 'android', 'cyborg', 'ai', 'artificial intelligence', 'machine', 'mech', 'automation'].some(kw => keywordString.includes(kw))) {
//             return 'robot-ai';
//         }

//         // Fantasy & Supernatural
//         if (['dragon', 'rồng', 'magic', 'wizard', 'fairy', 'tiên', 'fantasy', 'supernatural', 'mythical', 'unicorn'].some(kw => keywordString.includes(kw))) {
//             return 'fantasy';
//         }

//         // Advanced Architecture
//         if (['skyscraper', 'nhà chọc trời', 'futuristic', 'modern architecture', 'kiến trúc hiện đại', 'high-tech building'].some(kw => keywordString.includes(kw))) {
//             return 'advanced-architecture';
//         }

//         // Abstract & Art
//         if (['abstract', 'trừu tượng', 'modern art', 'nghệ thuật hiện đại', 'surreal', 'artistic'].some(kw => keywordString.includes(kw))) {
//             return 'abstract-art';
//         }

//         // Sports & Extreme
//         if (['extreme sport', 'thể thao mạo hiểm', 'skydiving', 'bungee', 'racing', 'motorsport'].some(kw => keywordString.includes(kw))) {
//             return 'extreme-sport';
//         }

//         return 'unknown';
//     }

//     /**
//      * ✅ Detect concept category for mismatch calculation
//      */
//     private detectConceptCategory(conceptName: string): string {
//         const name = conceptName.toLowerCase();

//         if (['con vật', 'animal', 'pet', 'thú cưng', 'mèo', 'chó'].some(kw => name.includes(kw))) {
//             return 'animal';
//         }

//         if (['người', 'portrait', 'chân dung', 'family', 'gia đình', 'wedding', 'cưới'].some(kw => name.includes(kw))) {
//             return 'people';
//         }

//         if (['thác', 'waterfall', 'cảnh', 'landscape', 'phong cảnh', 'thiên nhiên', 'nature'].some(kw => name.includes(kw))) {
//             return 'landscape';
//         }

//         if (['sản phẩm', 'product', 'đồ ăn', 'food', 'object'].some(kw => name.includes(kw))) {
//             return 'object';
//         }

//         return 'unknown';
//     }

//     /**
//      * ✅ Calculate mismatch penalty between image and concept categories
//      */
//     private calculateMismatchPenalty(imageCategory: string, conceptCategory: string): number {
//         // Perfect match = no penalty
//         if (imageCategory === conceptCategory) {
//             return 0.0;
//         }

//         // Define strong mismatches (high penalty)
//         const strongMismatches = [
//             // Sci-fi/Tech vs Nature
//             { image: 'sci-fi-space', concept: 'animal' },
//             { image: 'sci-fi-space', concept: 'landscape' },
//             { image: 'military-vehicle', concept: 'animal' },
//             { image: 'military-vehicle', concept: 'landscape' },
//             { image: 'robot-ai', concept: 'animal' },
//             { image: 'robot-ai', concept: 'landscape' },

//             // Fantasy vs Reality
//             { image: 'fantasy', concept: 'people' },
//             { image: 'fantasy', concept: 'landscape' },

//             // Abstract vs Concrete
//             { image: 'abstract-art', concept: 'animal' },
//             { image: 'abstract-art', concept: 'people' },

//             // Cross-category mismatches
//             { image: 'animal', concept: 'people' },
//             { image: 'people', concept: 'animal' },
//             { image: 'animal', concept: 'landscape' },
//             { image: 'landscape', concept: 'animal' },
//         ];

//         // Check for strong mismatches
//         for (const mismatch of strongMismatches) {
//             if (imageCategory === mismatch.image && conceptCategory === mismatch.concept) {
//                 return 0.9; // Very high penalty
//             }
//         }

//         // Special categories that rarely match traditional concepts
//         const specialCategories = ['sci-fi-space', 'military-vehicle', 'robot-ai', 'fantasy', 'abstract-art', 'extreme-sport', 'advanced-architecture'];

//         if (specialCategories.includes(imageCategory) && ['animal', 'people', 'landscape'].includes(conceptCategory)) {
//             return 0.8; // High penalty for special vs traditional
//         }

//         // Moderate mismatches
//         const moderateMismatches = [
//             { image: 'people', concept: 'landscape' },
//             { image: 'landscape', concept: 'people' },
//             { image: 'object', concept: 'animal' },
//             { image: 'object', concept: 'people' },
//         ];

//         for (const mismatch of moderateMismatches) {
//             if (imageCategory === mismatch.image && conceptCategory === mismatch.concept) {
//                 return 0.6; // Moderate penalty
//             }
//         }

//         // Unknown categories get low penalty
//         if (imageCategory === 'unknown' || conceptCategory === 'unknown') {
//             return 0.3;
//         }

//         // Default penalty for other mismatches
//         return 0.4;
//     }

//     /**
//      * ✅ Generate dynamic example text based on image type and context
//      */
//     private generateExampleText(imageType: string, concepts: any[], keywords: string[]): string {
//         // Extract main themes from concepts and keywords
//         const conceptNames = concepts.map(c => c.name?.toLowerCase() || '').filter(name => name);
//         const keywordString = keywords.join(' ').toLowerCase();

//         // Determine theme based on image type and content
//         if (imageType === 'animal') {
//             if (keywordString.includes('mèo') || keywordString.includes('cat')) {
//                 return "Concept chụp ảnh mèo cưng đáng yêu:";
//             }
//             if (keywordString.includes('chó') || keywordString.includes('dog')) {
//                 return "Concept chụp ảnh cún cưng siêu cute:";
//             }
//             if (conceptNames.some(name => name.includes('thú cưng') || name.includes('pet'))) {
//                 return "Concept chụp ảnh thú cưng chuyên nghiệp:";
//             }
//             return "Concept chụp ảnh động vật tuyệt đẹp:";
//         }

//         if (imageType === 'people') {
//             if (keywordString.includes('wedding') || keywordString.includes('cưới')) {
//                 return "Concept chụp ảnh cưới lãng mạn:";
//             }
//             if (keywordString.includes('family') || keywordString.includes('gia đình')) {
//                 return "Concept chụp ảnh gia đình hạnh phúc:";
//             }
//             if (keywordString.includes('couple') || keywordString.includes('cặp đôi')) {
//                 return "Concept chụp ảnh đôi ngọt ngào:";
//             }
//             if (keywordString.includes('portrait') || keywordString.includes('chân dung')) {
//                 return "Concept chụp chân dung nghệ thuật:";
//             }
//             return "Concept chụp ảnh người đẹp mắt:";
//         }

//         if (imageType === 'landscape') {
//             if (keywordString.includes('thác') || keywordString.includes('waterfall')) {
//                 return "Concept chụp ảnh thác nước hùng vĩ:";
//             }
//             if (keywordString.includes('núi') || keywordString.includes('mountain')) {
//                 return "Concept chụp ảnh núi non tráng lệ:";
//             }
//             if (keywordString.includes('biển') || keywordString.includes('beach') || keywordString.includes('sea')) {
//                 return "Concept chụp ảnh biển cả bình yên:";
//             }
//             if (keywordString.includes('sunset') || keywordString.includes('hoàng hôn')) {
//                 return "Concept chụp ảnh hoàng hôn thơ mộng:";
//             }
//             return "Concept chụp ảnh phong cảnh tuyệt đẹp:";
//         }

//         if (imageType === 'object') {
//             if (keywordString.includes('food') || keywordString.includes('đồ ăn')) {
//                 return "Concept chụp ảnh ẩm thực hấp dẫn:";
//             }
//             if (keywordString.includes('product') || keywordString.includes('sản phẩm')) {
//                 return "Concept chụp ảnh sản phẩm chuyên nghiệp:";
//             }
//             return "Concept chụp ảnh sáng tạo:";
//         }

//         // Fallback based on concept names
//         if (conceptNames.some(name => name.includes('cưới') || name.includes('wedding'))) {
//             return "Concept chụp ảnh cưới lãng mạn:";
//         }
//         if (conceptNames.some(name => name.includes('thú cưng') || name.includes('động vật'))) {
//             return "Concept chụp ảnh thú cưng đáng yêu:";
//         }
//         if (conceptNames.some(name => name.includes('phong cảnh') || name.includes('landscape'))) {
//             return "Concept chụp ảnh phong cảnh tuyệt đẹp:";
//         }

//         // Default fallback
//         return "Concept nổi bật của PhotoGo:";
//     }

//     async generateConceptVector(image: Express.Multer.File, concept_image_id: string): Promise<ConceptVector> {
//         const keywords = await this.generateKeywordsFromImage(image);
//         this.logger.log(`Generated keywords: ${keywords.join(', ')}`);
//         const embedding = await this.generateEmbedding(keywords.join(' '));
//         this.logger.log(`Generated embedding length: ${embedding.length}`);
//         if (!Array.isArray(embedding) || embedding.length !== 768 || !embedding.every(val => typeof val === 'number' && !isNaN(val))) {
//             throw new Error(`Invalid embedding: must be an array of 768 numbers`);
//         }
//         let conceptVector = await this.conceptVectorRepository.findOne({ where: { concept_image_id } });
//         if (!conceptVector) {
//             conceptVector = this.conceptVectorRepository.create({ concept_image_id, keywords, embedding });
//         } else {
//             conceptVector.keywords = keywords;
//             conceptVector.embedding = embedding;
//         }
//         return await this.conceptVectorRepository.save(conceptVector);
//     }

//     private async generateKeywordsFromImage(image: Express.Multer.File): Promise<string[]> {
//         // ✅ FIX: Improved cache key to prevent collisions
//         const fileHash = this.createFileHash(image.buffer);
//         const timestamp = Date.now();
//         const cacheKey = `keywords:${fileHash}:${image.originalname}:${image.size}`;
//         const cached = this.getCached<string[]>(cacheKey);
//         if (cached) {
//             this.logger.debug(`Cache hit for keywords: ${fileHash} (${image.originalname})`);
//             return cached;
//         }

//         this.logger.debug(`Generating fresh keywords for: ${image.originalname} (${image.size} bytes)`);

//         return await this.executeWithFallback(
//             async () => {
//                 const model = await this.initializeModel();
//                 const imageData = { inlineData: { data: image.buffer.toString('base64'), mimeType: image.mimetype } };

//                 // Cải thiện: Prompt ngắn gọn và rõ ràng hơn
//                 const prompt = `Phân tích ảnh này và trả về danh sách từ khóa mô tả nội dung.

// YÊU CẦU QUAN TRỌNG:
// - CHỈ trả về các từ khóa, KHÔNG giải thích gì thêm
// - Mỗi từ khóa tối đa 2-3 từ
// - Phân cách bằng dấu phẩy
// - Viết thường, không dấu ngoặc kép
// - Tối đa 20 từ khóa

// Ví dụ: người, nam, nữ, cặp đôi, mỉm cười, trong nhà, ánh sáng tự nhiên, portrait

// Hãy phân tích ảnh:`;

//                 const result = await model.generateContent([prompt, imageData]);
//                 const text = result.response.text();
//                 if (!text) {
//                     throw new Error('No text response from Gemini API');
//                 }

//                 // Cải thiện: Clean up và validate keywords
//                 let keywords = this.cleanupKeywords(text);

//                 // Giới hạn số lượng keywords
//                 if (keywords.length > 20) {
//                     keywords = keywords.slice(0, 20);
//                 }

//                 // Validate keywords quality
//                 keywords = this.validateKeywords(keywords);

//                 // Cache the result
//                 this.setCached(cacheKey, keywords);
//                 return keywords;
//             },
//             () => {
//                 // Fallback keywords
//                 const fallbackKeywords = ['image', 'photo', 'general'];
//                 if (image.mimetype.includes('jpeg')) fallbackKeywords.push('jpeg', 'photography');
//                 this.logger.warn(`Using fallback keywords for: ${image.originalname}`);
//                 return fallbackKeywords;
//             },
//             'Gemini keyword generation failed'
//         );
//     }

//     /**
//      * Clean up keywords từ Gemini response
//      */
//     private cleanupKeywords(text: string): string[] {
//         // Remove extra characters and normalize
//         let cleanText = text
//             .replace(/[{}""''`]/g, '') // Remove curly braces and quotes
//             .replace(/\n/g, ',') // Replace newlines with commas
//             .replace(/\s*,\s*/g, ',') // Normalize comma spacing
//             .trim();

//         // Split by comma and clean each keyword
//         let keywords = cleanText.split(',')
//             .map(k => k.trim().toLowerCase())
//             .filter(k => k.length > 0 && k.length < 50) // Filter out empty and overly long keywords
//             .filter(k => !k.includes('sự vô')) // Remove problematic patterns
//             .filter(k => !k.startsWith('sự ') || k.length < 15); // Limit "sự" keywords

//         // Remove duplicates
//         keywords = [...new Set(keywords)];

//         return keywords;
//     }

//     /**
//      * Validate và filter keywords quality
//      */
//     private validateKeywords(keywords: string[]): string[] {
//         const badPatterns = [
//             /^sự\s+/,           // Từ bắt đầu bằng "sự "
//             /vô\s+tận/,         // Từ chứa "vô tận"
//             /^\s*$/,            // Từ rỗng
//             /^[^a-zA-Zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ\s]+$/ // Từ không chứa chữ cái
//         ];

//         const validKeywords = keywords.filter(keyword => {
//             // Check against bad patterns
//             for (const pattern of badPatterns) {
//                 if (pattern.test(keyword)) {
//                     return false;
//                 }
//             }

//             // Keyword should be reasonable length
//             if (keyword.length < 2 || keyword.length > 30) {
//                 return false;
//             }

//             return true;
//         });

//         this.logger.debug(`Filtered ${keywords.length - validKeywords.length} invalid keywords`);
//         return validKeywords;
//     }

//     private async generateEmbedding(text: string): Promise<number[]> {
//         try {
//             // Tối ưu: Cache embedding model để tránh tạo mới mỗi lần
//             if (!this.embeddingModel) {
//                 this.embeddingModel = this.genAI.getGenerativeModel({ model: 'models/text-embedding-004' });
//             }

//             const result = await this.embeddingModel.embedContent(text);
//             const embedding = result.embedding.values;
//             if (!Array.isArray(embedding) || embedding.length !== 768) {
//                 throw new Error(`Invalid embedding format or length. Expected 768 numbers, got ${embedding.length}`);
//             }
//             return embedding;
//         } catch (error) {
//             this.logger.error(`Error generating embedding: ${error.message}`);
//             this.logger.warn(`Using fallback embedding for text: "${text}"`);
//             const fallbackEmbedding = new Array(768).fill(0);
//             const words = text.toLowerCase().split(/\s+/);
//             words.forEach((word, index) => {
//                 if (index < 768) {
//                     let hash = 0;
//                     for (let i = 0; i < word.length; i++) {
//                         hash = (hash << 5) - hash + word.charCodeAt(i);
//                         hash |= 0;
//                     }
//                     fallbackEmbedding[index] = (hash % 2000 - 1000) / 1000;
//                 }
//             });
//             return fallbackEmbedding;
//         }
//     }

//     //#region Database Optimization Helpers
//     /**
//      * Tối ưu: Suggest database indexes for better performance
//      * Call this during app startup or maintenance
//      */
//     async suggestDatabaseOptimizations(): Promise<string[]> {
//         const suggestions: string[] = [];

//         try {
//             // Check if vector index exists
//             const vectorIndexExists = await this.conceptVectorRepository.query(`
//                 SELECT indexname FROM pg_indexes
//                 WHERE tablename = 'concept_vector'
//                 AND indexname LIKE '%embedding%'
//             `);

//             if (vectorIndexExists.length === 0) {
//                 suggestions.push('CREATE INDEX CONCURRENTLY idx_concept_vector_embedding ON concept_vector USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);');
//             }

//             // Check if keyword index exists
//             const keywordIndexExists = await this.conceptVectorRepository.query(`
//                 SELECT indexname FROM pg_indexes
//                 WHERE tablename = 'concept_vector'
//                 AND indexname LIKE '%keywords%'
//             `);

//             if (keywordIndexExists.length === 0) {
//                 suggestions.push('CREATE INDEX CONCURRENTLY idx_concept_vector_keywords ON concept_vector USING GIN (keywords);');
//             }

//             // Check if composite index exists
//             const compositeIndexExists = await this.conceptVectorRepository.query(`
//                 SELECT indexname FROM pg_indexes
//                 WHERE tablename = 'concept_vector'
//                 AND indexname LIKE '%concept_image_id%'
//             `);

//             if (compositeIndexExists.length === 0) {
//                 suggestions.push('CREATE INDEX CONCURRENTLY idx_concept_vector_concept_image_id ON concept_vector (concept_image_id);');
//             }

//         } catch (error) {
//             this.logger.error(`Error checking database indexes: ${error.message}`);
//         }

//         return suggestions;
//     }
//     //#endregion

//     /**
//      * Tối ưu: Download ảnh từ URL và tạo concept vector
//      */
//     async regenerateVectorFromUrl(imageUrl: string, conceptImageId: string): Promise<void> {
//         try {
//             this.logger.log(`Downloading image from URL: ${imageUrl}`);

//             // Download image from URL
//             const response = await fetch(imageUrl);
//             if (!response.ok) {
//                 throw new Error(`Failed to download image: ${response.statusText}`);
//             }

//             const buffer = Buffer.from(await response.arrayBuffer());

//             // Create a mock file object
//             const mockFile: Express.Multer.File = {
//                 fieldname: 'image',
//                 originalname: 'downloaded-image.jpg',
//                 encoding: '7bit',
//                 mimetype: 'image/jpeg',
//                 buffer: buffer,
//                 size: buffer.length,
//                 stream: null as any,
//                 destination: '',
//                 filename: '',
//                 path: ''
//             };

//             // Generate concept vector
//             await this.generateConceptVector(mockFile, conceptImageId);
//             this.logger.log(`Vector regenerated successfully for image: ${imageUrl}`);

//         } catch (error) {
//             this.logger.error(`Failed to regenerate vector from URL ${imageUrl}: ${error.message}`);
//             // Don't throw to prevent the update process from failing
//         }
//     }

//     /**
//      * Tối ưu: Regenerate vectors for all existing images of a concept
//      */
//     async regenerateAllVectorsForConcept(conceptId: string): Promise<void> {
//         try {
//             this.logger.log(`Starting vector regeneration for all images of concept: ${conceptId}`);

//             // Get all images for this concept
//             const conceptImages = await this.serviceConceptImageRepository.find({
//                 where: { serviceConceptId: conceptId }
//             });

//             if (conceptImages.length === 0) {
//                 this.logger.log(`No images found for concept: ${conceptId}`);
//                 return;
//             }

//             this.logger.log(`Found ${conceptImages.length} images to regenerate vectors for`);

//             // Regenerate vector for each image
//             for (let i = 0; i < conceptImages.length; i++) {
//                 const image = conceptImages[i];
//                 this.logger.log(`Regenerating vector for image ${i + 1}/${conceptImages.length}: ${image.id}`);

//                 await this.regenerateVectorFromUrl(image.imageUrl, image.id);

//                 // Add small delay between requests to avoid overwhelming the API
//                 if (i < conceptImages.length - 1) {
//                     await new Promise(resolve => setTimeout(resolve, 500));
//                 }
//             }

//             this.logger.log(`Completed vector regeneration for concept: ${conceptId}`);

//         } catch (error) {
//             this.logger.error(`Failed to regenerate vectors for concept ${conceptId}: ${error.message}`);
//         }
//     }

//     private isServicePrompt(prompt?: string): boolean {
//         if (!prompt) return false;
//         const serviceKeywords = [
//             'dịch vụ gì', 'có những dịch vụ', 'service', 'các dịch vụ', 'danh sách dịch vụ',
//             'bên bạn có dịch vụ', 'show dịch vụ', 'liệt kê dịch vụ', 'gói dịch vụ', 'package', 'service list'
//         ];
//         const promptRaw = prompt.toLowerCase();
//         return serviceKeywords.some(kw => promptRaw.includes(kw));
//     }

//     /**
//      * Phân loại ảnh dựa trên keywords được tạo từ AI với độ chính xác cao
//      */
//     private categorizeImageByKeywords(
//         keywords: string[],
//         peopleKeywords: string[],
//         animalKeywords: string[],
//         landscapeKeywords: string[],
//         objectKeywords: string[]
//     ): string {
//         const keywordString = keywords.join(' ').toLowerCase();

//         let peopleScore = 0;
//         let animalScore = 0;
//         let landscapeScore = 0;
//         let objectScore = 0;

//         // Enhanced scoring với weight khác nhau cho keywords quan trọng
//         const animalHighPriorityKeywords = ['mèo', 'chó', 'thú cưng', 'pet', 'animal', 'động vật', 'cat', 'dog', 'kitten', 'puppy'];
//         const peopleHighPriorityKeywords = ['người', 'nam', 'nữ', 'portrait', 'chân dung', 'family', 'gia đình', 'couple', 'cặp đôi'];

//         // Đếm với weight cao cho keywords ưu tiên
//         peopleKeywords.forEach(kw => {
//             if (keywordString.includes(kw.toLowerCase())) {
//                 const weight = peopleHighPriorityKeywords.includes(kw.toLowerCase()) ? 3 : 1;
//                 peopleScore += weight;
//             }
//         });

//         animalKeywords.forEach(kw => {
//             if (keywordString.includes(kw.toLowerCase())) {
//                 const weight = animalHighPriorityKeywords.includes(kw.toLowerCase()) ? 3 : 1;
//                 animalScore += weight;
//             }
//         });

//         landscapeKeywords.forEach(kw => {
//             if (keywordString.includes(kw.toLowerCase())) {
//                 landscapeScore++;
//             }
//         });

//         objectKeywords.forEach(kw => {
//             if (keywordString.includes(kw.toLowerCase())) {
//                 objectScore++;
//             }
//         });

//         // Enhanced logic: ưu tiên động vật nếu có từ khóa động vật mạnh
//         const hasStrongAnimalKeywords = animalHighPriorityKeywords.some(kw =>
//             keywordString.includes(kw.toLowerCase())
//         );

//         const hasStrongPeopleKeywords = peopleHighPriorityKeywords.some(kw =>
//             keywordString.includes(kw.toLowerCase())
//         );

//         this.logger.debug(`Categorization scores - People: ${peopleScore}, Animal: ${animalScore}, Landscape: ${landscapeScore}, Object: ${objectScore}`);
//         this.logger.debug(`Strong keywords - Animal: ${hasStrongAnimalKeywords}, People: ${hasStrongPeopleKeywords}`);

//         // Special case: Nếu có từ khóa động vật mạnh và không có từ khóa người mạnh -> chắc chắn là động vật
//         if (hasStrongAnimalKeywords && !hasStrongPeopleKeywords && animalScore >= 2) {
//             this.logger.debug(`Classified as ANIMAL due to strong animal keywords`);
//             return 'animal';
//         }

//         // Special case: Nếu có từ khóa người mạnh và không có từ khóa động vật mạnh -> chắc chắn là người
//         if (hasStrongPeopleKeywords && !hasStrongAnimalKeywords && peopleScore >= 2) {
//             this.logger.debug(`Classified as PEOPLE due to strong people keywords`);
//             return 'people';
//         }

//         // Trả về category có score cao nhất
//         const maxScore = Math.max(peopleScore, animalScore, landscapeScore, objectScore);

//         if (maxScore === 0) {
//             return 'unknown'; // Không xác định được loại
//         }

//         // Ưu tiên động vật nếu tie với categories khác
//         if (animalScore === maxScore && animalScore > 0) {
//             return 'animal';
//         }
//         if (peopleScore === maxScore) {
//             return 'people';
//         }
//         if (landscapeScore === maxScore) {
//             return 'landscape';
//         }
//         if (objectScore === maxScore) {
//             return 'object';
//         }

//         return 'unknown';
//     }

//     /**
//      * Phân loại concept dựa trên tên concept
//      */
//     private categorizeConceptByName(conceptName: string): string {
//         const name = conceptName.toLowerCase();

//         // Keywords chi tiết để identify concept CON NGƯỜI
//         const peopleIndicators = [
//             // Giới tính & độ tuổi
//             'bé yêu', 'bé', 'baby', 'newborn', 'trẻ sơ sinh', 'infant', 'toddler',
//             'trẻ em', 'children', 'kid', 'child', 'thiếu niên', 'teenager', 'teen',
//             'người', 'nam', 'nữ', 'girl', 'boy', 'woman', 'man', 'adult', 'người lớn',
//             'elderly', 'senior', 'grandmother', 'grandfather', 'bà', 'ông',
//             'lady', 'ladies', 'quý phái', 'phái đẹp', 'miss', 'ms', 'mrs',

//             // Loại chụp & sự kiện
//             'portrait', 'chân dung', 'headshot', 'selfie', 'family', 'gia đình',
//             'couple', 'cặp đôi', 'group', 'nhóm', 'team', 'đội nhóm',
//             'wedding', 'cưới', 'bride', 'cô dâu', 'groom', 'chú rể', 'engagement', 'đính hôn',
//             'maternity', 'bầu bí', 'mang thai', 'pregnancy', 'thai sản',
//             'graduation', 'tốt nghiệp', 'birthday', 'sinh nhật', 'anniversary', 'kỷ niệm',
//             'profile', 'hồ sơ', 'avatar', 'sự kiện', 'event', 'quay', 'filming', 'video',

//             // Phong cách & modeling
//             'beauty', 'fashion', 'thời trang', 'model', 'modeling', 'makeup', 'trang điểm',
//             'cosplay', 'costume', 'trang phục', 'áo dài', 'traditional dress',
//             'street style', 'casual', 'formal', 'trang trọng', 'secret', 'bí mật',
//             'elegant', 'thanh lịch', 'sexy', 'quyến rũ', 'cute', 'dễ thương'
//         ];

//         // Keywords chi tiết để identify concept CON VẬT với độ ưu tiên
//         const animalIndicators = [
//             // Thú cưng - HIGH PRIORITY
//             'pet', 'thú cưng', 'domestic animal', 'động vật nuôi',
//             'cat', 'mèo', 'kitten', 'mèo con', 'feline', 'persian', 'british shorthair',
//             'dog', 'chó', 'puppy', 'chó con', 'canine', 'golden retriever', 'husky', 'poodle',
//             'rabbit', 'thỏ', 'bunny', 'hamster', 'guinea pig', 'bird', 'chim', 'parrot', 'vẹt',

//             // Từ khóa động vật chung - HIGH PRIORITY
//             'animal', 'động vật', 'con vật', 'con thú', 'animal portrait', 'chân dung động vật',

//             // Động vật hoang dã
//             'wildlife', 'động vật hoang dã', 'wild animal', 'safari',
//             'elephant', 'voi', 'lion', 'sư tử', 'tiger', 'hổ', 'bear', 'gấu',
//             'monkey', 'khỉ', 'panda', 'gấu trúc', 'deer', 'hươu',

//             // Động vật biển & khác
//             'fish', 'cá', 'dolphin', 'cá heo', 'whale', 'cá voi', 'marine animal',
//             'insect', 'côn trùng', 'butterfly', 'bướm'
//         ];

//         // Keywords chi tiết để identify concept CẢNH VẬT & KIẾN TRÚC
//         const landscapeIndicators = [
//             // Cảnh quan thiên nhiên
//             'landscape', 'phong cảnh', 'scenery', 'cảnh đẹp', 'natural scenery',
//             'mountain', 'núi', 'hill', 'đồi', 'beach', 'bãi biển', 'ocean', 'biển',
//             'lake', 'hồ', 'river', 'sông', 'waterfall', 'thác', 'forest', 'rừng',
//             'sunset', 'hoàng hôn', 'sunrise', 'bình minh', 'nature', 'thiên nhiên',

//             // Kiến trúc & công trình
//             'architecture', 'kiến trúc', 'building', 'tòa nhà', 'bridge', 'cầu',
//             'tower', 'tháp', 'castle', 'lâu đài', 'temple', 'đền', 'church', 'nhà thờ',
//             'pagoda', 'chùa', 'cityscape', 'cảnh thành phố', 'urban', 'đô thị',

//             // Môi trường
//             'outdoor', 'ngoài trời', 'countryside', 'nông thôn', 'park', 'công viên',
//             'garden', 'vườn', 'street', 'đường phố'
//         ];

//         // Keywords chi tiết để identify concept ĐỒ VẬT & SẢN PHẨM
//         const objectIndicators = [
//             // Sản phẩm & thương mại
//             'product', 'sản phẩm', 'still life', 'tĩnh vật', 'commercial', 'thương mại',
//             'merchandise', 'hàng hóa', 'advertising', 'quảng cáo',

//             // Đồ ăn & thức uống
//             'food', 'đồ ăn', 'cuisine', 'ẩm thực', 'fruit', 'trái cây', 'cake', 'bánh',
//             'coffee', 'cà phê', 'wine', 'rượu', 'dessert', 'tráng miệng',

//             // Công nghệ & thiết bị
//             'technology', 'công nghệ', 'device', 'thiết bị', 'phone', 'điện thoại',
//             'computer', 'máy tính', 'camera', 'máy ảnh', 'watch', 'đồng hồ',

//             // Phương tiện & xe cộ
//             'vehicle', 'phương tiện', 'car', 'ô tô', 'motorcycle', 'xe máy',
//             'bicycle', 'xe đạp', 'boat', 'thuyền', 'airplane', 'máy bay',

//             // Thời trang & phụ kiện
//             'fashion item', 'shoes', 'giày', 'bag', 'túi', 'jewelry', 'trang sức',
//             'clothing', 'quần áo', 'accessory', 'phụ kiện',

//             // Nội thất & trang trí
//             'furniture', 'nội thất', 'decoration', 'trang trí', 'artwork', 'nghệ thuật',
//             'antique', 'đồ cổ', 'vintage', 'cổ điển'
//         ];

//         // Enhanced scoring system với priority weights
//         const animalHighPriorityWords = ['pet', 'thú cưng', 'mèo', 'chó', 'cat', 'dog', 'animal', 'động vật'];
//         const peopleHighPriorityWords = ['người', 'bé', 'baby', 'family', 'gia đình', 'wedding', 'cưới', 'portrait', 'chân dung', 'model', 'girl', 'boy', 'lady', 'quý phái', 'woman', 'man', 'profile', 'sự kiện', 'event'];

//         let animalScore = 0;
//         let peopleScore = 0;
//         let landscapeScore = 0;
//         let objectScore = 0;

//         // Score với weights cho animal indicators
//         animalIndicators.forEach(indicator => {
//             if (name.includes(indicator)) {
//                 const weight = animalHighPriorityWords.includes(indicator) ? 3 : 1;
//                 animalScore += weight;
//             }
//         });

//         // Score với weights cho people indicators
//         peopleIndicators.forEach(indicator => {
//             if (name.includes(indicator)) {
//                 const weight = peopleHighPriorityWords.includes(indicator) ? 3 : 1;
//                 peopleScore += weight;
//             }
//         });

//         // Score cho landscape indicators
//         landscapeIndicators.forEach(indicator => {
//             if (name.includes(indicator)) {
//                 landscapeScore += 1;
//             }
//         });

//         // Score cho object indicators
//         objectIndicators.forEach(indicator => {
//             if (name.includes(indicator)) {
//                 objectScore += 1;
//             }
//         });

//         // Check for strong animal indicators first (highest priority)
//         const hasStrongAnimalWords = animalHighPriorityWords.some(word => name.includes(word));
//         const hasStrongPeopleWords = peopleHighPriorityWords.some(word => name.includes(word));

//         // Special case: Strong animal words and no strong people words -> definitely animal
//         if (hasStrongAnimalWords && !hasStrongPeopleWords && animalScore >= 2) {
//             return 'animal';
//         }

//         // Special case: Strong people words and no strong animal words -> definitely people
//         if (hasStrongPeopleWords && !hasStrongAnimalWords && peopleScore >= 2) {
//             return 'people';
//         }

//         // Determine winner by highest score
//         const maxScore = Math.max(animalScore, peopleScore, landscapeScore, objectScore);

//         if (maxScore === 0) {
//             return 'unknown';
//         }

//         // Prioritize animal if tied with others
//         if (animalScore === maxScore && animalScore > 0) {
//             return 'animal';
//         }
//         if (peopleScore === maxScore) {
//             return 'people';
//         }
//         if (landscapeScore === maxScore) {
//             return 'landscape';
//         }
//         if (objectScore === maxScore) {
//             return 'object';
//         }

//         return 'unknown';
//     }
// }
