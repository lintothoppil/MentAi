from sklearn.cluster import KMeans

def cluster_students(feature_matrix):
    if len(feature_matrix) < 3:
        return [0]*len(feature_matrix) # Cannot cluster with less than 3 students
        
    kmeans = KMeans(n_clusters=3, random_state=42)
    clusters = kmeans.fit_predict(feature_matrix)
    return clusters
