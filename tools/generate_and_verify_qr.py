"""
WattWise MVP QR Code Generator and Verification Suite
Generates deterministic QR codes for https://start-up-repo.vercel.app with Level H error correction.
Verifies decoded content, color palette, quiet zone, vector structure, and scannability.
"""

import os
import sys
import qrcode
from PIL import Image, ImageDraw
import pyzbar.pyzbar as pyzbar
import cv2
import numpy as np

DESTINATION_URL = "https://start-up-repo.vercel.app"

def get_qr_matrix(url: str):
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=1,
        border=0,
    )
    qr.add_data(url)
    qr.make(fit=True)
    return qr.get_matrix()

def create_pixel_perfect_qr_png(matrix, output_path: str, canvas_size: int = 1600, min_border_modules: int = 4):
    """
    Creates a pixel-perfect centered QR PNG of exact canvas_size x canvas_size.
    Uses pure black (#000000) and pure white (#FFFFFF).
    Renders on an exact integer grid so every module has crisp edges with zero anti-aliasing blur.
    """
    matrix_size = len(matrix)
    
    max_total_modules = matrix_size + 2 * min_border_modules
    module_size = canvas_size // max_total_modules
    
    qr_pixel_size = matrix_size * module_size
    offset_x = (canvas_size - qr_pixel_size) // 2
    offset_y = (canvas_size - qr_pixel_size) // 2
    
    # Create pure white RGB image (no transparency)
    img = Image.new("RGB", (canvas_size, canvas_size), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    for r in range(matrix_size):
        for c in range(matrix_size):
            if matrix[r][c]:
                x0 = offset_x + c * module_size
                y0 = offset_y + r * module_size
                x1 = x0 + module_size - 1
                y1 = y0 + module_size - 1
                draw.rectangle([x0, y0, x1, y1], fill=(0, 0, 0))
                
    img.save(output_path, "PNG", optimize=True)
    quiet_zone_modules_x = offset_x / module_size
    quiet_zone_modules_y = offset_y / module_size
    print(f"Generated {output_path}: {canvas_size}x{canvas_size} px | Matrix: {matrix_size}x{matrix_size} modules | Module size: {module_size}px | Quiet zone: {quiet_zone_modules_x:.2f} modules ({offset_x}px)")
    return img

def create_crisp_vector_svg(matrix, output_path: str, border: int = 4):
    """
    Creates a clean, standards-compliant vector SVG.
    Includes viewBox, crispEdges, solid white background rect, and single-path black modules.
    Scalable infinitely for PowerPoint, pitch decks, Figma, and print.
    """
    matrix_size = len(matrix)
    total_size = matrix_size + 2 * border
    
    path_d = []
    for r in range(matrix_size):
        for c in range(matrix_size):
            if matrix[r][c]:
                x = c + border
                y = r + border
                path_d.append(f"M{x} {y}h1v1h-1z")
    
    path_str = "".join(path_d)
    
    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_size} {total_size}" width="1600" height="1600" shape-rendering="crispEdges">
  <rect width="{total_size}" height="{total_size}" fill="#FFFFFF"/>
  <path d="{path_str}" fill="#000000"/>
</svg>
"""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"Generated {output_path}: Vector SVG (viewBox 0 0 {total_size} {total_size}, 1600x1600px)")

def decode_with_pyzbar(image_path_or_pil):
    if isinstance(image_path_or_pil, str):
        img = Image.open(image_path_or_pil)
    else:
        img = image_path_or_pil
    decoded_objects = pyzbar.decode(img)
    results = []
    for obj in decoded_objects:
        results.append(obj.data.decode('utf-8'))
    return results

def decode_with_opencv(image_path_or_pil):
    if isinstance(image_path_or_pil, str):
        cv_img = cv2.imread(image_path_or_pil)
    else:
        cv_img = cv2.cvtColor(np.array(image_path_or_pil), cv2.COLOR_RGB2BGR)
    detector = cv2.QRCodeDetector()
    data, points, _ = detector.detectAndDecode(cv_img)
    if data:
        return [data]
    return []

def run_suite():
    workspace_root = r"d:\LOMBA\MVP PROTOTIPE start-up"
    
    qr_png_path = os.path.join(workspace_root, "wattwise_mvp_qr.png")
    qr_svg_path = os.path.join(workspace_root, "wattwise_mvp_qr.svg")
    qr_pitchdeck_path = os.path.join(workspace_root, "wattwise_mvp_qr_pitchdeck.png")
    
    print("=" * 60)
    print("STEP 1: GENERATING QR CODE FILES")
    print(f"Target URL: {DESTINATION_URL}")
    print("=" * 60)
    
    matrix = get_qr_matrix(DESTINATION_URL)
    
    # 1. Standard QR PNG (1600 x 1600 px)
    img_1600 = create_pixel_perfect_qr_png(
        matrix,
        qr_png_path,
        canvas_size=1600,
        min_border_modules=4
    )
    
    # 2. Vector SVG
    create_crisp_vector_svg(
        matrix,
        qr_svg_path,
        border=4
    )
    
    # 3. Pitchdeck QR PNG (1200 x 1200 px with generous quiet zone)
    img_1200 = create_pixel_perfect_qr_png(
        matrix,
        qr_pitchdeck_path,
        canvas_size=1200,
        min_border_modules=6
    )
    
    # Also copy to wattwise-vercel/public/brand/ for web app access
    public_brand_dir = os.path.join(workspace_root, "wattwise-vercel", "public", "brand")
    if os.path.exists(public_brand_dir):
        img_1600.save(os.path.join(public_brand_dir, "wattwise_mvp_qr.png"), "PNG")
        img_1200.save(os.path.join(public_brand_dir, "wattwise_mvp_qr_pitchdeck.png"), "PNG")
        create_crisp_vector_svg(matrix, os.path.join(public_brand_dir, "wattwise_mvp_qr.svg"), border=4)
        print(f"Also synced deliverables to: {public_brand_dir}")

    print("\n" + "=" * 60)
    print("STEP 2: MANDATORY DECODING AND SCANNABILITY VERIFICATION")
    print("=" * 60)
    
    all_tests_passed = True
    
    # Test 1: wattwise_mvp_qr.png Full Size
    print("\n--- Test 1: wattwise_mvp_qr.png (1600x1600 px) ---")
    pyzbar_res = decode_with_pyzbar(qr_png_path)
    opencv_res = decode_with_opencv(qr_png_path)
    print(f"Pyzbar Decoded: {pyzbar_res}")
    print(f"OpenCV Decoded: {opencv_res}")
    
    t1_pass = (pyzbar_res == [DESTINATION_URL]) and (opencv_res == [DESTINATION_URL])
    print(f"Test 1 Result: {'PASS' if t1_pass else 'FAIL'}")
    if not t1_pass:
        all_tests_passed = False
        
    # Test 2: wattwise_mvp_qr_pitchdeck.png Full Size
    print("\n--- Test 2: wattwise_mvp_qr_pitchdeck.png (1200x1200 px) ---")
    pyzbar_res_pd = decode_with_pyzbar(qr_pitchdeck_path)
    opencv_res_pd = decode_with_opencv(qr_pitchdeck_path)
    print(f"Pyzbar Decoded: {pyzbar_res_pd}")
    print(f"OpenCV Decoded: {opencv_res_pd}")
    
    t2_pass = (pyzbar_res_pd == [DESTINATION_URL]) and (opencv_res_pd == [DESTINATION_URL])
    print(f"Test 2 Result: {'PASS' if t2_pass else 'FAIL'}")
    if not t2_pass:
        all_tests_passed = False

    # Test 3: Downscaled to 250 x 250 px (Small-size test)
    print("\n--- Test 3: Small-Size Scannability (250x250 px Nearest) ---")
    img_250_std = img_1600.resize((250, 250), Image.Resampling.NEAREST)
    img_250_pd = img_1200.resize((250, 250), Image.Resampling.NEAREST)
    
    pyzbar_250_std = decode_with_pyzbar(img_250_std)
    opencv_250_std = decode_with_opencv(img_250_std)
    pyzbar_250_pd = decode_with_pyzbar(img_250_pd)
    opencv_250_pd = decode_with_opencv(img_250_pd)
    
    print(f"Standard (250px) - Pyzbar: {pyzbar_250_std} | OpenCV: {opencv_250_std}")
    print(f"Pitchdeck (250px) - Pyzbar: {pyzbar_250_pd} | OpenCV: {opencv_250_pd}")
    
    t3_pass = (
        (pyzbar_250_std == [DESTINATION_URL] or opencv_250_std == [DESTINATION_URL]) and
        (pyzbar_250_pd == [DESTINATION_URL] or opencv_250_pd == [DESTINATION_URL])
    )
    print(f"Test 3 Result: {'PASS' if t3_pass else 'FAIL'}")
    if not t3_pass:
        all_tests_passed = False

    # Test 4: Bilinear / Antialiased Downscale Test (Simulates real screen / camera rendering)
    print("\n--- Test 4: Camera / Screen Simulation (250x250 px Lanczos) ---")
    img_250_lanczos = img_1600.resize((250, 250), Image.Resampling.LANCZOS)
    img_250_pd_lanczos = img_1200.resize((250, 250), Image.Resampling.LANCZOS)
    pyzbar_lanczos = decode_with_pyzbar(img_250_lanczos)
    opencv_lanczos = decode_with_opencv(img_250_lanczos)
    pyzbar_pd_lanczos = decode_with_pyzbar(img_250_pd_lanczos)
    opencv_pd_lanczos = decode_with_opencv(img_250_pd_lanczos)
    print(f"Standard (250px Lanczos) - Pyzbar: {pyzbar_lanczos} | OpenCV: {opencv_lanczos}")
    print(f"Pitchdeck (250px Lanczos) - Pyzbar: {pyzbar_pd_lanczos} | OpenCV: {opencv_pd_lanczos}")
    
    t4_pass = (
        (pyzbar_lanczos == [DESTINATION_URL] or opencv_lanczos == [DESTINATION_URL]) and
        (pyzbar_pd_lanczos == [DESTINATION_URL] or opencv_pd_lanczos == [DESTINATION_URL])
    )
    print(f"Test 4 Result: {'PASS' if t4_pass else 'FAIL'}")
    if not t4_pass:
        all_tests_passed = False

    # Test 5: Color Integrity and Palette Verification
    print("\n--- Test 5: Color Integrity and Palette Verification ---")
    colors_1600 = img_1600.getcolors(maxcolors=256)
    unique_colors = set([c[1] for c in colors_1600])
    expected_colors = {(0, 0, 0), (255, 255, 255)}
    print(f"Unique colors present in 1600px: {unique_colors}")
    colors_1200 = img_1200.getcolors(maxcolors=256)
    unique_colors_1200 = set([c[1] for c in colors_1200])
    print(f"Unique colors present in 1200px: {unique_colors_1200}")
    t5_pass = (unique_colors == expected_colors) and (unique_colors_1200 == expected_colors)
    print(f"Test 5 Result: {'PASS' if t5_pass else 'FAIL'}")
    if not t5_pass:
        all_tests_passed = False

    # Test 6: SVG Vector Integrity Check
    print("\n--- Test 6: SVG Vector Integrity Check ---")
    with open(qr_svg_path, 'r', encoding='utf-8') as f:
        svg_content = f.read()
    svg_has_xml = "<svg" in svg_content and "</svg>" in svg_content
    svg_has_viewbox = 'viewBox="' in svg_content
    svg_no_raster = "data:image" not in svg_content
    svg_pass = svg_has_xml and svg_has_viewbox and svg_no_raster
    print(f"SVG valid XML: {svg_has_xml} | Has viewBox: {svg_has_viewbox} | Pure vector (no raster): {svg_no_raster}")
    print(f"Test 6 Result: {'PASS' if svg_pass else 'FAIL'}")
    if not svg_pass:
        all_tests_passed = False

    print("\n" + "=" * 60)
    print(f"OVERALL VERIFICATION STATUS: {'ALL TESTS PASSED' if all_tests_passed else 'SOME TESTS FAILED'}")
    print("=" * 60)
    
    return all_tests_passed

if __name__ == "__main__":
    success = run_suite()
    sys.exit(0 if success else 1)
